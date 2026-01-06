import type * as rdfjs from "@rdfjs/types";
import * as oxigraph from "oxigraph";
import type { Quad, Store } from "oxigraph";
import { skolemizeQuad } from "./skolem.ts";
import type { Patch, PatchHandler, PatchPuller } from "./rdf-patch.ts";
import type { RankedResult, SearchStore } from "./search-store.ts";

/**
 * Local copy of createOxigraphProxy that emits patches on add/delete.
 */
function createOxigraphProxy(
  store: Store,
  handler: PatchHandler,
): Store {
  return new Proxy(store, {
    get(target: Store, prop: string | symbol, _receiver: unknown) {
      // Intercept methods that modify the store
      switch (prop) {
        case "add": {
          return (quad: Quad) => {
            const result = target.add(quad);
            handler.patch({
              insertions: [quad],
              deletions: [],
            });
            return result;
          };
        }

        case "delete": {
          return (quad: Quad) => {
            const result = target.delete(quad);
            handler.patch({
              insertions: [],
              deletions: [quad],
            });
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
    private readonly documentStore: Map<string, ExampleDocument>,
  ) {}

  private readonly pending = new Set<Promise<void>>();

  private async addQuad(quad: rdfjs.Quad): Promise<void> {
    const documentId = await skolemizeQuad(quad);
    this.documentStore.set(documentId, {
      id: documentId,
      subject: quad.subject.value,
      predicate: quad.predicate.value,
      object: quad.object.value,
    });
  }

  private async deleteQuad(quad: rdfjs.Quad): Promise<void> {
    const documentId = await skolemizeQuad(quad);
    this.documentStore.delete(documentId);
  }

  public patch(patch: Patch): Promise<void> {
    const promise = (async () => {
      await Promise.all(
        patch.deletions.map((deletion) => this.deleteQuad(deletion)),
      );
      await Promise.all(
        patch.insertions.map((insertion) => this.addQuad(insertion)),
      );
    })();

    // const promise = Promise.all(patch.deletions.map((q) => this.deleteQuad(q)))
    //   .then(() => Promise.all(patch.insertions.map((q) => this.addQuad(q))));

    this.pending.add(promise);
    promise.finally(() => this.pending.delete(promise));

    return promise;
  }

  public async waitForIdle(): Promise<void> {
    if (this.pending.size === 0) {
      return;
    }
    await Promise.all(Array.from(this.pending));
  }
}

/**
 * ExamplePatchPuller pulls patches from the oxigraph store.
 */
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

/**
 * ExampleSearchStore searches the example document store.
 */
export class ExampleSearchStore implements SearchStore {
  public constructor(
    private readonly dataFactory: rdfjs.DataFactory,
    private readonly documentStore: Map<string, ExampleDocument>,
  ) {}

  public search(
    _query: string,
    limit = 10,
  ): Promise<RankedResult<rdfjs.NamedNode>[]> {
    const rankedResults = Array.from(this.documentStore.values())
      .slice(0, limit)
      .map((document, index) => ({
        rank: index + 1,
        score: 0,
        value: this.dataFactory.namedNode(document.subject),
      }));

    return Promise.resolve(rankedResults);
  }
}

const exampleOxigraphStore = new oxigraph.Store();
const exampleDocumentStore = new Map<string, ExampleDocument>();
const examplePatchHandler = new ExamplePatchHandler(exampleDocumentStore);

// Wrap store with proxy so add/delete emit patches
const proxiedStore = createOxigraphProxy(
  exampleOxigraphStore,
  examplePatchHandler,
);

// Optionally still wire puller if you want pull-based patches as well
const examplePatchPuller = new ExamplePatchPuller(exampleOxigraphStore);
await pull(examplePatchHandler, examplePatchPuller);

const subject = oxigraph.namedNode("https://example.org/planet/Hoth");
const predicate = oxigraph.namedNode("https://example.org/property/name");
const object = oxigraph.literal("Hoth"); // string literal passes filterStringLiteral
const quad = oxigraph.quad(subject, predicate, object);

proxiedStore.add(quad);
await examplePatchHandler.waitForIdle();
console.table(Array.from(exampleDocumentStore.values()));

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
