import { assertEquals } from "@std/assert";
import { Store } from "oxigraph";
import { DataFactory } from "n3";
import type * as rdfjs from "@rdfjs/types";
import { syncSnapshot, syncToSearchStore } from "./sync.ts";
import type { SearchStore } from "../search-store.ts";
import type { PatchStore } from "../sources/event-driven-patch-source.ts";
import type { RDFPatch } from "../core/rdf-patch.ts";

const { quad, namedNode, literal } = DataFactory;

class FakeSearchStore implements SearchStore {
  public addedQuads: rdfjs.Quad[] = [];
  public removedQuads: rdfjs.Quad[] = [];

  async addQuad(quad: rdfjs.Quad): Promise<void> {
    this.addedQuads.push(quad);
  }

  async addQuads(quads: rdfjs.Quad[]): Promise<void> {
    this.addedQuads.push(...quads);
  }

  async removeQuad(quad: rdfjs.Quad): Promise<void> {
    this.removedQuads.push(quad);
  }

  async removeQuads(quads: rdfjs.Quad[]): Promise<void> {
    this.removedQuads.push(...quads);
  }
}

/**
 * TestPatchStore wraps an Oxigraph Store and adds patch callback support.
 */
class TestPatchStore implements PatchStore {
  private handlers: Array<(patch: RDFPatch) => void> = [];

  constructor(private store: Store) {}

  query(query: string, options?: unknown): unknown {
    // Type assertion needed because Oxigraph's query options type is complex
    return this.store.query(query, options as any);
  }

  onPatch(callback: (patch: RDFPatch) => void): () => void {
    this.handlers.push(callback);
    return () => {
      const index = this.handlers.indexOf(callback);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  // Helper method for tests to emit patches
  emit(patch: RDFPatch): void {
    for (const handler of this.handlers) {
      handler(patch);
    }
  }

  // Expose store methods for adding quads
  // Type assertion needed because N3 and Oxigraph quads have different TypeScript types
  // but are compatible at runtime
  add(quad: rdfjs.Quad): void {
    this.store.add(quad as any);
  }
}

Deno.test("syncSnapshot initializes search store", async () => {
  const oxigraphStore = new Store();
  // Use Oxigraph's native quad creation to avoid type incompatibility
  const storeAny = oxigraphStore as any;
  const subject = storeAny.namedNode("http://example.org/subject");
  const predicate = storeAny.namedNode("http://example.org/predicate");
  const object = storeAny.literal("value");
  const testQuad = storeAny.quad(subject, predicate, object);
  oxigraphStore.add(testQuad);

  const rdfStore = new TestPatchStore(oxigraphStore);
  const searchStore = new FakeSearchStore();

  await syncSnapshot(rdfStore, searchStore);

  assertEquals(searchStore.addedQuads.length, 1);
  assertEquals(searchStore.addedQuads[0].subject.value, testQuad.subject.value);
});

Deno.test("syncToSearchStore sets up live synchronization", async () => {
  const oxigraphStore = new Store();
  const rdfStore = new TestPatchStore(oxigraphStore);
  const searchStore = new FakeSearchStore();

  const testQuad = quad(
    namedNode("http://example.org/subject"),
    namedNode("http://example.org/predicate"),
    literal("value"),
  );

  const subscription = syncToSearchStore(rdfStore, searchStore);

  // Emit a patch
  rdfStore.emit({ action: "add", quad: testQuad });

  // Wait for sync to process
  await new Promise((resolve) => setTimeout(resolve, 50));

  await subscription.unsubscribe();

  // Should have synced the patch
  assertEquals(searchStore.addedQuads.length, 1);
  assertEquals(searchStore.addedQuads[0].subject.value, testQuad.subject.value);
});
