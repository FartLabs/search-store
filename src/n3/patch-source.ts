import { Store } from "n3";
import type { Patch, PatchSource } from "../patch.ts";
import { createN3Proxy } from "./proxy.ts";

/**
 * N3PatchSource is a source that produces patches from an N3 store.
 */
export class N3PatchSource implements PatchSource {
  public readonly store: Store;
  private readonly subscribers = new Map<
    (patch: Patch) => void | Promise<void>,
    Promise<void>
  >();

  public constructor(store: Store) {
    this.store = createN3Proxy(store, this);
  }

  /**
   * emit processes a patch sequentially for all subscribers.
   * Returns a promise that resolves when all subscribers have processed the patch.
   */
  public emit(patch: Patch): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [subscriber, lastPromise] of this.subscribers.entries()) {
      // Chain: wait for previous patch, then process this one
      const newPromise = lastPromise.then(async () => {
        await Promise.resolve(subscriber(patch));
      });
      this.subscribers.set(subscriber, newPromise);
      promises.push(newPromise);
    }

    return Promise.all(promises).then(() => undefined);
  }

  public subscribe(fn: (patch: Patch) => void | Promise<void>): () => void {
    // Initialize with a resolved promise for this subscriber
    this.subscribers.set(fn, Promise.resolve());
    return () => {
      this.subscribers.delete(fn);
    };
  }

  public async *pull(): AsyncIterable<Patch> {
    const insertions = this.store
      .getQuads(null, null, null, null)
      .filter((quad) => {
        if (quad.object.termType !== "Literal") {
          return false;
        }

        return (
          quad.object.language ||
          (!quad.object.datatype ||
            quad.object.datatype.value ===
              "http://www.w3.org/2001/XMLSchema#string")
        );
      });

    yield {
      insertions,
      deletions: [],
    };
  }
}
