import type * as rdfjs from "@rdfjs/types";
import { create } from "@orama/orama";
import type { RankedResult, SearchStore } from "../search-store.ts";
import type { Patch, PatchSink } from "../patch.ts";
import { skolemizeQuad } from "../skolem.ts";

/**
 * Orama is the type of our Orama instance.
 */
export type Orama = ReturnType<typeof createOrama>;

/**
 * createOrama creates a new Orama instance.
 */
export function createOrama(vectorSize: number) {
  return create({
    schema: {
      id: "string",
      subject: "string",
      predicate: "string",
      object: "string",
      graph: "string",
      embedding: `vector[${vectorSize}]`,
    },
  });
}

/**
 * OramaEmbedder embeds text into a vector space.
 */
export interface OramaEmbedder {
  embed(text: string): Promise<number[]>;
}

/**
 * OramaStore is a store that can be searched and patched.
 */
export class OramaSearchStore implements SearchStore, PatchSink {
  public constructor(
    private readonly orama: Orama,
    private readonly embedder: OramaEmbedder,
  ) {}

  public async patch(patches: AsyncIterable<Patch>): Promise<void> {
    for await (const patch of patches) {
      for (const deletion of patch.deletions) {
        const documentId = await skolemizeQuad(deletion);
      }

      for (const insertion of patch.insertions) {
        const documentId = await skolemizeQuad(insertion);
      }
    }
  }

  /**
   * @see https://docs.orama.com/docs/orama-js/search/hybrid-search#performing-hybrid-search
   */
  public async search(
    query: string,
    limit?: number,
  ): Promise<RankedResult<rdfjs.NamedNode>[]> {
    throw new Error("Method not implemented.");
  }
}
