import type * as rdfjs from "@rdfjs/types";
import type { QuadSource } from "../core/quad-source.ts";
import type { PatchSink } from "../core/patch-sink.ts";
import type { QuadFilter } from "../core/quad-source.ts";
import type { Subscription } from "./subscription.ts";
import type { RDFPatch } from "../core/rdf-patch.ts";
import type { PatchCallbackSource } from "../sources/event-driven-patch-source.ts";

/**
 * PatchSync synchronizes quads from a source to a patch sink using
 * the patch/delta pattern.
 *
 * This is the recommended approach for live synchronization as it
 * properly handles both insertions and deletions atomically.
 */
export interface PatchSync {
  /**
   * sync performs a one-time synchronization from source to sink.
   * Converts all current quads to patches with "add" action.
   */
  sync(
    source: QuadSource,
    sink: PatchSink,
    filter?: QuadFilter,
  ): Promise<void>;

  /**
   * subscribe sets up ongoing synchronization via patches.
   * Sources emit patches directly, which are then applied to the sink.
   *
   * @param patches - Async iterable of patches
   * @param sink - The patch sink to apply patches to
   * @param options - Optional configuration for batching
   * @returns A subscription that can be used to cancel synchronization
   */
  subscribe(
    patches: AsyncIterable<RDFPatch>,
    sink: PatchSink,
    options?: PatchSyncOptions,
  ): Promise<Subscription>;

  /**
   * subscribeToCallbacks sets up ongoing synchronization via typed callbacks.
   * This is more direct than converting callbacks to async iterables.
   *
   * @param source - The callback source that provides patches
   * @param sink - The patch sink to apply patches to
   * @param filter - Optional filter for patches
   * @param options - Optional configuration for batching
   * @returns A subscription that can be used to cancel synchronization
   */
  subscribeToCallbacks(
    source: PatchCallbackSource,
    sink: PatchSink,
    filter?: QuadFilter,
    options?: PatchSyncOptions,
  ): Subscription;
}

/**
 * PatchSyncOptions configures patch synchronization behavior.
 */
export interface PatchSyncOptions {
  /**
   * batchSize is the number of patches to batch before applying.
   * Defaults to 1 (each patch is applied immediately).
   * Larger batch sizes can improve performance but increase latency.
   */
  batchSize?: number;

  /**
   * batchTimeout is the maximum time (ms) to wait before flushing a batch.
   * Defaults to 0 (no timeout, only flush on batchSize).
   */
  batchTimeout?: number;
}

/**
 * DefaultPatchSync provides standard patch-based synchronization logic.
 */
export class DefaultPatchSync implements PatchSync {
  public async sync(
    source: QuadSource,
    sink: PatchSink,
    filter?: QuadFilter,
  ): Promise<void> {
    // Convert snapshot quads to patches with "add" action
    async function* generatePatches(): AsyncGenerator<RDFPatch> {
      for await (const quad of source.snapshot(filter)) {
        yield { action: "add" as const, quad };
      }
    }

    await sink.applyPatches(generatePatches());
  }

  public subscribe(
    patches: AsyncIterable<RDFPatch>,
    sink: PatchSink,
    options?: PatchSyncOptions,
  ): Promise<Subscription> {
    const batchSize = options?.batchSize ?? 1;
    const batchTimeout = options?.batchTimeout ?? 0;

    let cancelled = false;
    const batch: RDFPatch[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | null = null;

    const flushBatch = async () => {
      if (batch.length === 0) return;

      async function* generatePatches() {
        for (const patch of batch) {
          yield patch;
        }
      }

      const patchesToApply = generatePatches();
      batch.length = 0;

      await sink.applyPatches(patchesToApply);
    };

    const scheduleFlush = () => {
      if (batchTimer) {
        clearTimeout(batchTimer);
      }

      if (batchTimeout > 0) {
        batchTimer = setTimeout(() => {
          flushBatch();
        }, batchTimeout);
      }
    };

    const streamPromise = (async () => {
      for await (const patch of patches) {
        if (cancelled) break;

        batch.push(patch);

        if (batch.length >= batchSize) {
          await flushBatch();
          scheduleFlush();
        } else {
          scheduleFlush();
        }
      }

      // Flush any remaining patches
      await flushBatch();
    })();

    return Promise.resolve({
      unsubscribe: async () => {
        cancelled = true;
        if (batchTimer) {
          clearTimeout(batchTimer);
        }
        await streamPromise;
      },
    });
  }

  public subscribeToCallbacks(
    source: PatchCallbackSource,
    sink: PatchSink,
    filter?: QuadFilter,
    options?: PatchSyncOptions,
  ): Subscription {
    const batchSize = options?.batchSize ?? 1;
    const batchTimeout = options?.batchTimeout ?? 0;

    let cancelled = false;
    const batch: RDFPatch[] = [];
    let batchTimer: ReturnType<typeof setTimeout> | null = null;

    const flushBatch = async () => {
      if (batch.length === 0 || cancelled) return;

      async function* generatePatches() {
        for (const patch of batch) {
          yield patch;
        }
      }

      const patchesToApply = generatePatches();
      batch.length = 0;

      await sink.applyPatches(patchesToApply);
    };

    const scheduleFlush = () => {
      if (batchTimer) {
        clearTimeout(batchTimer);
      }

      if (batchTimeout > 0) {
        batchTimer = setTimeout(() => {
          flushBatch();
        }, batchTimeout);
      }
    };

    // Filter function for patches
    const matchesFilter = (patch: RDFPatch): boolean => {
      if (!filter || !filter.objectType || filter.objectType === "all") {
        return true;
      }

      const object = patch.quad.object;
      if (object.termType !== "Literal") {
        return false;
      }

      if (filter.objectType === "string") {
        return (
          object.datatype.value ===
            "http://www.w3.org/2001/XMLSchema#string"
        );
      }

      if (filter.objectType === "langString") {
        return (
          object.datatype.value ===
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
        );
      }

      return true;
    };

    // Subscribe to patch callbacks
    const unsubscribe = source.onPatch((patch: RDFPatch) => {
      if (cancelled) return;

      // Apply filter if provided
      if (!matchesFilter(patch)) {
        return;
      }

      batch.push(patch);

      if (batch.length >= batchSize) {
        flushBatch();
        scheduleFlush();
      } else {
        scheduleFlush();
      }
    });

    return {
      unsubscribe: async () => {
        cancelled = true;
        if (batchTimer) {
          clearTimeout(batchTimer);
        }
        unsubscribe();
        // Flush any remaining patches
        await flushBatch();
      },
    };
  }
}
