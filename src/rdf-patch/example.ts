import type * as rdfjs from "@rdfjs/types";
import * as oxigraph from "oxigraph";
import { levenshteinDistance } from "@std/text/levenshtein-distance";
import { skolemizeQuad } from "./skolem.ts";
import type { Patch, PatchHandler, PatchPuller } from "./rdf-patch.ts";
import type { RankedResult, SearchStore } from "./search-store.ts";
import starWarsTtl from "./star-wars.ttl" with { type: "text" };

/**
 * ExampleSearchStore searches an example document store.
 */
export class ExampleSearchStore implements SearchStore {
  public constructor(
    private readonly dataFactory: rdfjs.DataFactory,
    private readonly documentStore: typeof exampleDocumentStore,
  ) {}

  public search(
    query: string,
    limit = 10,
  ): Promise<RankedResult<rdfjs.NamedNode>[]> {
    let maxDistance = 1;
    const rankedNodes: Map<string, number> = new Map();
    for (const document of this.documentStore.values()) {
      const distance = levenshteinDistance(query, document.object);
      const totalDistance = distance + (rankedNodes.get(document.subject) ?? 0);
      rankedNodes.set(document.subject, totalDistance);
      maxDistance = Math.max(maxDistance, totalDistance);
    }

    const rankedResults = rankedNodes
      .entries()
      .toArray()
      .toSorted((a, b) => a[1] - b[1])
      .slice(0, limit)
      .map(([subject, distance], index) => ({
        rank: index + 1,
        score: 1 - (distance / maxDistance),
        value: this.dataFactory.namedNode(subject),
      }));

    return Promise.resolve(rankedResults);
  }
}

interface ExampleDocument {
  id: string;
  subject: string;
  predicate: string;
  object: string;
}

/**
 * ExamplePatchHandler applies patches to an example document store.
 */
class ExamplePatchHandler implements PatchHandler {
  public constructor(
    private readonly documentStore: typeof exampleDocumentStore,
  ) {}

  public async patch(patch: Patch): Promise<void> {
    for (const deletion of patch.deletions) {
      const documentId = await skolemizeQuad(deletion);
      this.documentStore.delete(documentId);
    }

    for (const insertion of patch.insertions) {
      const documentId = await skolemizeQuad(insertion);
      this.documentStore.set(documentId, {
        id: documentId,
        subject: insertion.subject.value,
        predicate: insertion.predicate.value,
        object: insertion.object.value,
      });
    }
  }
}

class ExamplePatchPuller implements PatchPuller {
  public constructor(private readonly oxigraphStore: oxigraph.Store) {}

  public pull(): Promise<Patch[]> {
    const insertions = this.oxigraphStore
      .match(null, null, null, null)
      .filter((quad) => filterStringLiteral(quad));

    const patch: Patch = {
      insertions,
      deletions: [],
    };

    return Promise.resolve([patch]);
  }
}

function filterStringLiteral(quad: oxigraph.Quad): boolean {
  return (quad.object.termType === "Literal") &&
    (quad.object.language !== undefined ||
      (!quad.object.datatype ||
        quad.object.datatype.value ===
          "http://www.w3.org/2001/XMLSchema#string"));
}

/**
 * pull pulls patches from the puller and applies them to the handler.
 */
async function pull(handler: PatchHandler, puller: PatchPuller): Promise<void> {
  const patches = await puller.pull();
  for (const patch of patches) {
    await handler.patch(patch);
  }
}

const exampleOxigraphStore = new oxigraph.Store();
exampleOxigraphStore.load(starWarsTtl, { format: "ttl" });

const exampleDocumentStore = new Map<string, ExampleDocument>();
const examplePatchHandler = new ExamplePatchHandler(exampleDocumentStore);
const examplePatchPuller = new ExamplePatchPuller(exampleOxigraphStore);

await pull(examplePatchHandler, examplePatchPuller);

const exampleSearchStore = new ExampleSearchStore(
  oxigraph as rdfjs.DataFactory,
  exampleDocumentStore,
);

const results = await exampleSearchStore.search("Hoth");
console.table(results.map((result) => ({
  rank: result.rank,
  score: result.score,
  value: result.value.value,
})));
