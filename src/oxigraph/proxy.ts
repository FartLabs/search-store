import type { Quad, Store } from "oxigraph";
import type { PatchSink } from "#/rdf-patch/rdf-patch.ts";

/**
 * createOxigraphProxy wraps a Store with a proxy that listens to changes and
 * emits patches.
 */
export function createOxigraphProxy(
  store: Store,
  patchSink: PatchSink,
): Store {
  return new Proxy(store, {
    get(target, prop, _receiver) {
      // Intercept methods that modify the store
      switch (prop) {
        case "add": {
          return (quad: Quad) => {
            const result = target[prop](quad);
            patchSink.patch({
              insertions: [quad],
              deletions: [],
            });

            return result;
          };
        }

        case "delete": {
          return (quad: Quad) => {
            const result = target[prop](quad);
            patchSink.patch({
              insertions: [],
              deletions: [quad],
            });

            return result;
          };
        }

        default: {
          return target[prop as keyof typeof target];
        }
      }
    },
  });
}
