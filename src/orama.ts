import type * as rdfjs from "@rdfjs/types";
import { create, insertMultiple, removeMultiple, search } from "@orama/orama";
import { PatchQueue } from "./queue.ts";
import type { RankedResult, SearchStore } from "./search-store.ts";
import type { Patch, PatchPusher } from "./rdf-patch.ts";
import type { Embedder } from "./embedder.ts";
import { skolemizeQuad } from "./skolem.ts";

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
 * OramaDocument is a document in the Orama index.
 */
export interface OramaDocument {
  id: string;
  subject: string;
  predicate: string;
  object: string;
  graph: string;
  embedding: number[];
}

/**
 * generateOramaDocument generates an Orama document from a quad.
 */
export async function generateOramaDocument(
  options: OramaSearchStoreOptions,
  quad: rdfjs.Quad,
): Promise<OramaDocument> {
  const documentId = await skolemizeQuad(quad);
  return {
    id: documentId,
    subject: quad.subject.value,
    predicate: quad.predicate.value,
    object: quad.object.value,
    graph: quad.graph?.value ?? "",
    embedding: await options.embedder.embed(quad.object.value),
  };
}

/**
 * OramaSearchStoreOptions are the options for the OramaSearchStore.
 */
export interface OramaSearchStoreOptions {
  dataFactory: rdfjs.DataFactory;
  orama: Orama;
  embedder: Embedder;
}

/**
 * OramaStore is a store that can be searched and patched.
 */
export class OramaSearchStore implements SearchStore, PatchPusher {
  private readonly patchQueue = new PatchQueue();

  public constructor(private readonly options: OramaSearchStoreOptions) {}

  public push(...patches: Patch[]): void {
    this.patchQueue.push(...patches);
  }

  public async pull(): Promise<void> {
    const patches = this.patchQueue.pull();
    console.log("OramaSearchStore: Applying patches", patches);
    await this.applyPatches(patches);
  }

  /**
   * @see https://docs.orama.com/docs/orama-js/search/hybrid-search#performing-hybrid-search
   */
  public async search(
    query: string,
    limit: number = 10,
  ): Promise<RankedResult<rdfjs.NamedNode>[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const embedding = await this.options.embedder.embed(query);
    const searchResult = await search(this.options.orama, {
      mode: "hybrid",
      term: query,
      vector: {
        value: embedding,
        property: "embedding",
      },
      limit,
      includeVectors: false,
    });

    return searchResult.hits.map((hit, index) => {
      const subject = hit.document.subject;
      return {
        rank: index + 1,
        score: hit.score,
        value: this.options.dataFactory.namedNode(subject),
      };
    });
  }

  private async applyPatches(patches: Patch[]): Promise<void> {
    for (const patch of patches) {
      await this.applyDeletions(patch.deletions);
      await this.applyInsertions(patch.insertions);
    }
  }

  private async applyDeletions(deletions: rdfjs.Quad[]): Promise<void> {
    const deletedDocumentIds = await Promise.all(
      deletions.map((deletion) => skolemizeQuad(deletion)),
    );

    await removeMultiple(this.options.orama, deletedDocumentIds);
  }

  private async applyInsertions(insertions: rdfjs.Quad[]): Promise<void> {
    const insertedDocuments = await Promise.all(
      insertions.map((insertion) =>
        generateOramaDocument(this.options, insertion)
      ),
    );

    await insertMultiple(this.options.orama, insertedDocuments);
  }
}
