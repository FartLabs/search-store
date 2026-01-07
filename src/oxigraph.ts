import type { Quad, Store } from "oxigraph";
import type {
  Patch,
  PatchProxy,
  PatchPuller,
  PatchPusher,
} from "./rdf-patch.ts";

/**
 * filterStringLiteral filters quads with string literals.
 */
export function filterStringLiteral(quad: Quad): boolean {
  return (quad.object.termType === "Literal") &&
    (quad.object.language !== undefined ||
      (!quad.object.datatype ||
        quad.object.datatype.value ===
          "http://www.w3.org/2001/XMLSchema#string"));
}

/**
 * OxigraphPatchPuller pulls patches from the Oxigraph store.
 */
export class OxigraphPatchPuller implements PatchPuller {
  public constructor(private readonly store: Store) {}

  public pull(): Patch[] {
    const insertions = this.store
      .match(null, null, null, null)
      .filter((quad) => filterStringLiteral(quad));

    const patch: Patch = {
      insertions,
      deletions: [],
    };

    return [patch];
  }
}

/**
 * OxigraphPatchProxy proxies a Store with a patch handler.
 *
 * It intercepts and emits patches for add and delete methods.
 */
export class OxigraphPatchProxy implements PatchProxy<Store> {
  public proxy(target: Store, pusher: PatchPusher): Store {
    return new Proxy(target, {
      get(target: Store, prop: string | symbol, _receiver: unknown) {
        switch (prop) {
          case "add": {
            return (quad: Quad) => {
              const result = target.add(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [quad], deletions: [] });
              }

              return result;
            };
          }

          case "delete": {
            return (quad: Quad) => {
              const result = target.delete(quad);
              if (filterStringLiteral(quad)) {
                pusher.push({ insertions: [], deletions: [quad] });
              }

              return result;
            };
          }

          default: {
            return (target as Store)[prop as keyof Store];
          }
        }
      },
    });
  }
}

/**
 * proxyOxigraph wraps a Store with a proxy that emits patches.
 */
export function proxyOxigraph(store: Store, pusher: PatchPusher): Store {
  const proxy = new OxigraphPatchProxy();
  return proxy.proxy(store, pusher);
}
