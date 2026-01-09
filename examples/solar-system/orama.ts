import type * as rdfjs from "@rdfjs/types";
import { create, insertMultiple, removeMultiple, search } from "@orama/orama";
import type { SearchResult, SearchStore } from "#/search-store.ts";
import type { Patch } from "#/rdf-patch.ts";
import { skolemizeQuad } from "#/skolem.ts";
import type { Embedder } from "./embedder.ts";

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
      embedding: `vector[${vectorSize}]`,
    },
  });
}

/**
 * OramaDocument is a document in the Orama index.
 */
export interface OramaDocument {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  embedding: number[];
}

/**
 * generateOramaDocument generates an Orama document from a quad.
 */
export async function generateOramaDocument(
  embedder: Embedder,
  quad: rdfjs.Quad,
): Promise<OramaDocument> {
  const documentId = await skolemizeQuad(quad);
  const embedding = await embedder.embed(quad.object.value);
  return {
    id: documentId,
    subject: quad.subject.value,
    predicate: quad.predicate.value,
    object: quad.object.value,
    embedding,
  };
}

/**
 * OramaSearchStoreOptions are the options for the OramaSearchStore.
 */
export interface OramaSearchStoreOptions {
  dataFactory: rdfjs.DataFactory;
  orama: Orama;
  embedder: Embedder;
  mode: "fulltext" | "hybrid" | "vector";
}

/**
 * OramaSearchStore is a store that can be searched and patched.
 *
 * @see https://docs.orama.com/docs/cloud/performing-search/introduction
 */
export class OramaSearchStore implements SearchStore<rdfjs.NamedNode> {
  public constructor(private readonly options: OramaSearchStoreOptions) {}

  private async addQuads(quads: rdfjs.Quad[]): Promise<void> {
    const insertedDocumentIds = await Promise.all(
      quads.map((quad) => generateOramaDocument(this.options.embedder, quad)),
    );

    await insertMultiple(this.options.orama, insertedDocumentIds);
  }

  private async removeQuads(quads: rdfjs.Quad[]): Promise<void> {
    const deletedDocumentIds = await Promise.all(
      quads.map((quad) => skolemizeQuad(quad)),
    );

    await removeMultiple(this.options.orama, deletedDocumentIds);
  }

  public async patch(patches: Patch[]): Promise<void> {
    for (const patch of patches) {
      await this.removeQuads(patch.deletions);
      await this.addQuads(patch.insertions);
    }
  }

  public async search(
    query: string,
    limit = 10,
  ): Promise<SearchResult<rdfjs.NamedNode>[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchResult = await search(this.options.orama, {
      mode: this.options.mode,
      term: query,
      limit,
      groupBy: { properties: ["subject"] },
      properties: ["object"],
      includeVectors: false,
    });
    if (!searchResult?.groups) {
      return [];
    }

    return searchResult.groups.map((group) => {
      const subject = group.values[0];
      if (typeof subject !== "string") {
        throw new Error("Subject is not a string");
      }

      const hit = group.result[0];
      if (hit === undefined) {
        throw new Error("Hit is undefined");
      }

      const value = this.options.dataFactory.namedNode(subject);
      return {
        score: hit.score,
        value,
      };
    });
  }
}
