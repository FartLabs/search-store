import type { Patch, PatchSource } from "./rdf-patch.ts";

/**
 * PatchSourceImpl is a base implementation of PatchSource that manages subscribers.
 * It only emits patches to subscribers and does not receive patches itself.
 */
export class PatchSourceImpl implements PatchSource {
  private readonly subscribers = new Map<
    (patch: Patch) => void | Promise<void>,
    Promise<void>
  >();

  /**
   * subscribe subscribes to a stream of patches.
   * Returns a function to unsubscribe.
   */
  public subscribe(fn: (patch: Patch) => void | Promise<void>): () => void {
    // Initialize with a resolved promise for this subscriber
    this.subscribers.set(fn, Promise.resolve());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  /**
   * emit notifies all subscribers of a patch.
   * This is called by the sink created by proxy().
   */
  public async emit(patch: Patch): Promise<void> {
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
  }
}
