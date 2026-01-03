import type * as rdfjs from "@rdfjs/types";
import type { RDFPatch } from "../core/rdf-patch.ts";
import type { QuadFilter } from "../core/quad-source.ts";
import { buildSnapshotQuery } from "../utils/sparql-queries.ts";

/**
 * PatchCallback is a typed callback function that receives patches.
 */
export type PatchCallback = (patch: RDFPatch) => void;

/**
 * PatchCallbackSource provides a callback-based interface for receiving patches.
 * This is simpler and more maintainable than event emitters.
 */
export interface PatchCallbackSource {
  /**
   * onPatch subscribes to patch callbacks.
   * Returns a function to unsubscribe.
   */
  onPatch(callback: PatchCallback): () => void;
}

/**
 * PatchStore is a store that both queries and provides patch callbacks.
 * This unified interface allows stores to be used directly.
 */
export interface PatchStore {
  /**
   * query executes a SPARQL query and returns results.
   */
  query(query: string, options?: unknown): unknown;

  /**
   * onPatch subscribes to patch callbacks.
   * Returns a function to unsubscribe.
   */
  onPatch(callback: PatchCallback): () => void;
}

/**
 * PatchSource adapts a callback-based RDF store for patch-based
 * synchronization.
 *
 * This source provides snapshots and can convert callbacks to async iterables
 * for use with PatchSync.
 */
export class PatchSource {
  public constructor(
    private readonly store: {
      query(query: string, options?: unknown): rdfjs.Quad[];
    },
    private readonly patchCallbackSource: PatchCallbackSource,
    private readonly options?: unknown,
  ) {}

  /**
   * snapshot returns all quads matching the filter criteria.
   */
  public async *snapshot(filter?: QuadFilter): AsyncIterable<rdfjs.Quad> {
    const query = buildSnapshotQuery(filter);
    const quads = this.store.query(query, this.options) as rdfjs.Quad[];
    yield* quads;
  }

  /**
   * patches returns patches as they occur in the store.
   * Converts callbacks to an async iterable for use with PatchSync.
   */
  public async *patches(filter?: QuadFilter): AsyncIterable<RDFPatch> {
    const queue: RDFPatch[] = [];
    let wakeUp: (() => void) | null = null;
    let done = false;

    // Subscribe to patch callbacks
    const unsubscribe = this.patchCallbackSource.onPatch((patch: RDFPatch) => {
      // Apply filter if provided
      if (filter && !this.matchesFilter(patch.quad, filter)) {
        return;
      }

      queue.push(patch);
      // Wake up the async generator if it's waiting
      if (wakeUp) {
        const callback = wakeUp;
        wakeUp = null;
        callback();
      }
    });

    try {
      while (true) {
        // Yield any queued patches
        while (queue.length > 0) {
          yield queue.shift()!;
        }

        // Wait for next patch
        await new Promise<void>((resolve) => {
          wakeUp = resolve;
        });

        // Check if we should continue
        if (done) break;
      }
    } finally {
      unsubscribe();
      done = true;
      // Wake up any pending wait to allow cleanup
      const pendingWakeUp = wakeUp;
      wakeUp = null;
      if (pendingWakeUp) {
        pendingWakeUp();
      }
    }
  }

  /**
   * matchesFilter checks if a quad matches the filter criteria.
   */
  private matchesFilter(quad: rdfjs.Quad, filter: QuadFilter): boolean {
    if (!filter.objectType || filter.objectType === "all") {
      return true;
    }

    const object = quad.object;
    if (object.termType !== "Literal") {
      return false;
    }

    if (filter.objectType === "string") {
      return object.datatype.value ===
        "http://www.w3.org/2001/XMLSchema#string";
    }

    if (filter.objectType === "langString") {
      return (
        object.datatype.value ===
          "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString"
      );
    }

    return true;
  }
}
