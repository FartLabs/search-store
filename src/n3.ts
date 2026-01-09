import type { Store } from "n3";
import type * as rdfjs from "@rdfjs/types";
import type { Patch, PatchHandler, PatchHandlerSync } from "./rdf-patch.ts";
import type { SearchStore } from "./search-store.ts";

/**
 * filterStringLiteral filters quads with string literals.
 */
export function filterStringLiteral(quad: rdfjs.Quad): boolean {
  return (quad.object.termType === "Literal") &&
    (quad.object.language !== undefined ||
      (!quad.object.datatype ||
        quad.object.datatype.value ===
          "http://www.w3.org/2001/XMLSchema#string"));
}

/**
 * insertStore inserts an N3 store into a search store.
 *
 * It filters quads with string literals and inserts them into the
 * search store.
 */
export async function insertStore<T>(
  searchStore: SearchStore<T>,
  store: Store,
): Promise<void> {
  const insertions = Array.from(store)
    .filter((quad) => filterStringLiteral(quad));
  await searchStore.patch([{ insertions, deletions: [] }]);
}

/**
 * SearchStorePatchQueue connects a search store to a patch queue.
 */
export class SearchStorePatchQueue<T> implements PatchHandler {
  public constructor(
    private readonly searchStore: SearchStore<T>,
    private readonly queue: PatchQueue,
  ) {}

  public async patch(patches: Patch[]): Promise<void> {
    await this.searchStore.patch(patches);
  }

  public async apply(): Promise<void> {
    const patches = this.queue.flush();
    await this.patch(patches);
  }
}

/**
 * PatchQueue is a queue of patches.
 *
 * It collects patches and flushes them to another handler.
 */
export class PatchQueue implements PatchHandlerSync {
  private patches: Patch[] = [];

  public patch(patches: Patch[]): void {
    this.patches.push(...patches);
  }

  public flush(): Patch[] {
    const patches = this.patches;
    this.patches = [];
    return patches;
  }
}

/**
 * proxyN3 proxies an N3 Store with a patch handler.
 *
 * It intercepts and emits patches for add and remove methods.
 *
 * @see https://rdf.js.org/N3.js/docs/N3Store.html
 */
export function proxyN3(target: Store, handler: PatchHandlerSync): Store {
  return new Proxy(target, {
    get(target: Store, prop: string | symbol, receiver: unknown) {
      switch (prop) {
        case "add": {
          return (quad: rdfjs.Quad) => {
            const result = target.add(quad);
            if (filterStringLiteral(quad)) {
              handler.patch([{ insertions: [quad], deletions: [] }]);
            }

            return result;
          };
        }

        case "addQuad": {
          return (quad: rdfjs.Quad) => {
            const result = target.addQuad(quad);
            if (filterStringLiteral(quad)) {
              handler.patch([{ insertions: [quad], deletions: [] }]);
            }

            return result;
          };
        }

        case "addQuads": {
          return (quads: rdfjs.Quad[]) => {
            const result = target.addQuads(quads);
            const insertions = quads.filter((q) => filterStringLiteral(q));
            if (insertions.length > 0) {
              handler.patch([{ insertions, deletions: [] }]);
            }

            return result;
          };
        }

        case "removeQuad": {
          return (quad: rdfjs.Quad) => {
            const result = target.removeQuad(quad);
            if (filterStringLiteral(quad)) {
              handler.patch([{ insertions: [], deletions: [quad] }]);
            }

            return result;
          };
        }

        case "removeQuads": {
          return (quads: rdfjs.Quad[]) => {
            const result = target.removeQuads(quads);
            const deletions = quads.filter((q) => filterStringLiteral(q));
            if (deletions.length > 0) {
              handler.patch([{ insertions: [], deletions }]);
            }

            return result;
          };
        }

        default: {
          return Reflect.get(target, prop, receiver);
        }
      }
    },
  });
}

/**
 * connectSearchStoreToN3Store connects a search store to an N3 store.
 *
 * It returns a proxied store and a `sync` function to apply patches to the search store.
 *
 * The `sync` function indexes pending patches by inserting and deleting documents.
 */
export function connectSearchStoreToN3Store<T>(
  searchStore: SearchStore<T>,
  n3Store: Store,
): { store: Store; sync: () => Promise<void> } {
  // Connect the RDF store to the search store.
  const patchQueue = new PatchQueue();
  const proxiedStore = proxyN3(n3Store, patchQueue);

  // Sync the search store with the RDF store.
  return {
    store: proxiedStore,
    sync: async () => {
      const patches = patchQueue.flush();
      await searchStore.patch(patches);
    },
  };
}
