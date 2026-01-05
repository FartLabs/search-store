import type { Store } from "oxigraph";
import type * as rdfjs from "@rdfjs/types";
import type { QuadSource } from "#/rdf-patch/quad-source.ts";

/**
 * OxigraphQuadSource is a source that provides quads from an Oxigraph store.
 * It filters quads to only include string literals (language-tagged, plain, or xsd:string typed).
 */
export class OxigraphQuadSource implements QuadSource {
  public readonly store: Store;

  public constructor(store: Store) {
    this.store = store;
  }

  public async *getQuads(): AsyncIterable<rdfjs.Quad> {
    const quads = this.store
      .match(null, null, null, null)
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

    yield* quads;
  }
}
