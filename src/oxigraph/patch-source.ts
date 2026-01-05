import type { Store } from "oxigraph";
import type { Patch, PatchSource } from "#/rdf-patch/rdf-patch.ts";
import { createOxigraphProxy } from "./proxy.ts";

/**
 * PatchQueueItem is an item in the patch queue.
 */
interface PatchQueueItem {
  patch: Patch;
  resolve: () => void;
}

/**
 * OxigraphPatchSource is a source that produces patches from an Oxigraph store.
 */
export class OxigraphPatchSource implements PatchSource {
  public readonly store: Store;
  private processing = Promise.resolve();
  private patchQueue: Array<PatchQueueItem> = [];
  private readonly subscribers = new Map<
    (patch: Patch) => void | Promise<void>,
    Promise<void>
  >();

  public constructor(store: Store) {
    this.store = createOxigraphProxy(store, this);
  }

  /**
   * patch processes a patch sequentially for all subscribers.
   * Returns a promise that resolves when the patch has been processed.
   */
  public patch(patch: Patch): Promise<void> {
    return new Promise<void>((resolve) => {
      this.patchQueue.push({ patch, resolve });
      this.processQueue();
    });
  }

  private processQueue(): void {
    this.processing = this.processing.then(async () => {
      while (this.patchQueue.length > 0) {
        const { patch, resolve } = this.patchQueue.shift()!;

        const promises: Promise<void>[] = [];

        for (const [subscriber, lastPromise] of this.subscribers.entries()) {
          // Chain: wait for previous patch, then process this one
          const newPromise = lastPromise.then(async () => {
            await Promise.resolve(subscriber(patch));
          });
          this.subscribers.set(subscriber, newPromise);
          promises.push(newPromise);
        }

        await Promise.all(promises);
        resolve();
      }

      // Check if new patches arrived while we were processing
      if (this.patchQueue.length > 0) {
        this.processQueue();
      }
    });
  }

  public subscribe(fn: (patch: Patch) => void | Promise<void>): () => void {
    // Initialize with a resolved promise for this subscriber
    this.subscribers.set(fn, Promise.resolve());
    return () => {
      this.subscribers.delete(fn);
    };
  }
}
