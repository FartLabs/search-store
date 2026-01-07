import type { Store } from "n3";
import type * as rdfjs from "@rdfjs/types";
import type {
  Patch,
  PatchProxy,
  PatchPuller,
  PatchPusher,
} from "./rdf-patch.ts";

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
 * N3PatchPuller pulls patches from the N3 store.
 */
export class N3PatchPuller implements PatchPuller {
  public constructor(private readonly store: Store) {}

  public pull(): Patch[] {
    const insertions = Array.from(this.store).filter((quad) =>
      filterStringLiteral(quad)
    );

    const patch: Patch = {
      insertions,
      deletions: [],
    };

    return [patch];
  }
}

/**
 * N3PatchProxy proxies an N3 Store with a patch handler.
 *
 * It intercepts and emits patches for add and remove methods.
 *
 * @see https://rdf.js.org/N3.js/docs/N3Store.html
 */
export class N3PatchProxy implements PatchProxy<Store> {
  public proxy(target: Store, pusher: PatchPusher): Store {
    return new Proxy(target, {
      get(target: Store, prop: string | symbol, receiver: unknown) {
        switch (prop) {
          case "add": {
            return (quad: rdfjs.Quad) => {
              const result = target.add(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [quad], deletions: [] });
              }
              return result;
            };
          }

          case "addQuad": {
            return (quad: rdfjs.Quad) => {
              const result = target.addQuad(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [quad], deletions: [] });
              }

              return result;
            };
          }

          case "addQuads": {
            return (quads: rdfjs.Quad[]) => {
              const result = target.addQuads(quads);
              const insertions = quads.filter((q) => filterStringLiteral(q));
              if (insertions.length > 0) {
                pusher.push({ insertions, deletions: [] });
              }

              return result;
            };
          }

          case "removeQuad": {
            return (quad: rdfjs.Quad) => {
              const result = target.removeQuad(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [], deletions: [quad] });
              }

              return result;
            };
          }

          case "removeQuads": {
            return (quads: rdfjs.Quad[]) => {
              const result = target.removeQuads(quads);
              const deletions = quads.filter((q) => filterStringLiteral(q));
              if (deletions.length > 0) {
                pusher.push({ insertions: [], deletions: deletions });
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
}

/**
 * proxyN3 wraps an N3 Store with a proxy that emits patches.
 */
export function proxyN3(
  store: Store,
  pusher: PatchPusher,
): Store {
  const proxy = new N3PatchProxy();
  return proxy.proxy(store, pusher);
}
