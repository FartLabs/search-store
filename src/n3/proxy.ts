import { Store } from "n3";
import type * as rdfjs from "@rdfjs/types";
import type { PatchSink } from "#/rdf-patch/rdf-patch.ts";

/**
 * createN3Proxy wraps a Store with a proxy that listens to changes and
 * emits patches.
 */
export function createN3Proxy(
  store: Store,
  patchSink: PatchSink,
): Store {
  return new Proxy(store, {
    get(target, prop, _receiver) {
      // Intercept methods that modify the store
      switch (prop) {
        case "addQuad": {
          return (quad: rdfjs.Quad) => {
            const result = target[prop](quad);
            // Fire and forget - promise chain in patchSink ensures sequential processing
            patchSink.patch({
              insertions: [quad],
              deletions: [],
            });

            return result;
          };
        }

        case "addQuads": {
          return (quads: rdfjs.Quad[] | rdfjs.Dataset) => {
            const result = target[prop](quads as rdfjs.Quad[]);
            const insertions = Array.isArray(quads) ? quads : Array.from(quads);
            // Fire and forget - promise chain in patchSink ensures sequential processing
            patchSink.patch({
              insertions,
              deletions: [],
            });

            return result;
          };
        }

        case "removeQuad": {
          return (quad: rdfjs.Quad) => {
            const result = target[prop](quad);
            // Fire and forget - promise chain in patchSink ensures sequential processing
            patchSink.patch({
              insertions: [],
              deletions: [quad],
            });

            return result;
          };
        }

        case "removeQuads": {
          return (quads: rdfjs.Quad[]) => {
            const result = target[prop](quads);
            // Fire and forget - promise chain in patchSink ensures sequential processing
            patchSink.patch({
              insertions: [],
              deletions: quads,
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
