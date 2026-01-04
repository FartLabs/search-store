import { assertEquals } from "@std/assert";
import { search } from "@orama/orama";
import { DataFactory, Store } from "n3";
import { createOrama, type OramaEmbedder, OramaSearchStore } from "./orama.ts";
import { N3PatchSource } from "../n3/patch-source.ts";

/**
 * FakeEmbedder for testing that returns a fixed-size vector.
 */
class FakeEmbedder implements OramaEmbedder {
  constructor(private readonly vectorSize: number) {}

  embed(_text: string): Promise<number[]> {
    return Promise.resolve(new Array(this.vectorSize).fill(0));
  }
}

Deno.test("OramaSearchStore as patch sink tracks patches from n3 store", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, embedder);

  // Create an n3 store and patch source
  const n3Store = new Store();
  const patchSource = new N3PatchSource(n3Store);

  // Collect patches from the n3 store
  const patches: Array<{ insertions: number; deletions: number }> = [];
  const unsubscribe = patchSource.subscribe(async (patch) => {
    patches.push({
      insertions: patch.insertions.length,
      deletions: patch.deletions.length,
    });
    // Apply patches to the search store
    await searchStore.patch(async function* () {
      yield patch;
    }());
  });

  // Add a string literal quad to the proxied store (this will emit patches)
  const quad1 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s1"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("Hello World"),
  );
  patchSource.store.addQuad(quad1);

  // Add another string literal quad
  const quad2 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s2"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("Test String"),
  );
  patchSource.store.addQuad(quad2);

  // Remove the first quad
  patchSource.store.removeQuad(quad1);

  // Wait for all async operations to complete (patches are processed sequentially)
  // Give a small delay to ensure all promise chains have resolved
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Verify patches were collected
  assertEquals(patches.length, 3);
  assertEquals(patches[0].insertions, 1);
  assertEquals(patches[0].deletions, 0);
  assertEquals(patches[1].insertions, 1);
  assertEquals(patches[1].deletions, 0);
  assertEquals(patches[2].insertions, 0);
  assertEquals(patches[2].deletions, 1);

  // Verify the search store has the correct document
  // The second quad should still be in the store
  // Use Orama's search with empty query to get all documents
  const searchResults = await search(orama, {});
  assertEquals(searchResults.hits.length, 1);
  const doc = searchResults.hits[0].document as {
    id: string;
    subject: string;
    predicate: string;
    object: string;
    graph: string;
    embedding: number[];
  };
  assertEquals(doc.subject, quad2.subject.value);
  assertEquals(doc.predicate, quad2.predicate.value);
  assertEquals(doc.object, quad2.object.value);

  unsubscribe();
});
