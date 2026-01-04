import { Store } from "n3";
import type { Patch, PatchSource } from "../patch.ts";
import { n3Proxy } from "./proxy.ts";

/**
 * N3PatchSource is a source that produces patches from an N3 store.
 */
export class N3PatchSource implements PatchSource {
  private readonly store: Store;
  private readonly subscribers = new Set<(patch: Patch) => void>();

  public constructor(store: Store) {
    this.store = n3Proxy(store, this.subscribers);
  }

  public subscribe(fn: (patch: Patch) => void): () => void {
    this.subscribers.add(fn);
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
