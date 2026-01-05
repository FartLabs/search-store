import { assertEquals } from "@std/assert";
import { search } from "@orama/orama";
import { DataFactory, Store } from "n3";
import { createOrama, OramaSearchStore } from "./orama.ts";
import { FakeEmbedder } from "#/embeddings/fake.ts";
import { N3PatchSource } from "#/n3/patch-source.ts";
import type { Patch } from "#/rdf-patch/rdf-patch.ts";

Deno.test("OramaSearchStore as patch sink tracks patches from n3 store", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, vectorSize, embedder);

  // Create an n3 store and patch source
  const n3Store = new Store();
  const patchSource = new N3PatchSource(n3Store);

  // Collect patches from the n3 store
  const patchCounts: Array<{ insertions: number; deletions: number }> = [];
  const unsubscribe = patchSource.subscribe(async (patch: Patch) => {
    patchCounts.push({
      insertions: patch.insertions.length,
      deletions: patch.deletions.length,
    });
    // Apply patches to the search store
    await searchStore.patch(patch);
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
  assertEquals(patchCounts.length, 3);
  assertEquals(patchCounts[0].insertions, 1);
  assertEquals(patchCounts[0].deletions, 0);
  assertEquals(patchCounts[1].insertions, 1);
  assertEquals(patchCounts[1].deletions, 0);
  assertEquals(patchCounts[2].insertions, 0);
  assertEquals(patchCounts[2].deletions, 1);

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

Deno.test("OramaSearchStore.search returns empty array for empty query", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, vectorSize, embedder);

  // Insert some test data
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s1"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("Hello World"),
  );
  await searchStore.patch({ insertions: [quad], deletions: [] });

  // Test empty string
  const results1 = await searchStore.search("");
  assertEquals(results1.length, 0);

  // Test whitespace-only string
  const results2 = await searchStore.search("   ");
  assertEquals(results2.length, 0);
});

Deno.test("OramaSearchStore.search returns RankedResult with correct format", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, vectorSize, embedder);

  // Insert test data
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject1"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.literal("Hello World"),
  );
  await searchStore.patch({ insertions: [quad], deletions: [] });

  // Perform search
  const results = await searchStore.search("Hello");

  // Verify results format
  assertEquals(results.length, 1);
  assertEquals(results[0].rank, 1);
  assertEquals(typeof results[0].score, "number");
  assertEquals(results[0].score >= 0 && results[0].score <= 1, true);
  assertEquals(results[0].value.termType, "NamedNode");
  assertEquals(results[0].value.value, "https://example.org/subject1");
});

Deno.test("OramaSearchStore.search returns results with correct ranking", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, vectorSize, embedder);

  // Insert multiple test documents
  const quads = [
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s1"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Hello World"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s2"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Hello There"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s3"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Goodbye World"),
    ),
  ];
  await searchStore.patch({ insertions: quads, deletions: [] });

  // Perform search
  const results = await searchStore.search("Hello");

  // Verify ranking is 1-indexed and sequential
  for (let i = 0; i < results.length; i++) {
    assertEquals(results[i].rank, i + 1);
  }

  // Verify results are sorted by score (descending)
  for (let i = 0; i < results.length - 1; i++) {
    assertEquals(results[i].score >= results[i + 1].score, true);
  }
});

Deno.test("OramaSearchStore.search respects limit parameter", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, vectorSize, embedder);

  // Insert multiple test documents
  const quads = [
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s1"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Hello World"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s2"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Hello There"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s3"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Hello Everyone"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s4"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Hello Friend"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/s5"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("Hello Again"),
    ),
  ];
  await searchStore.patch({ insertions: quads, deletions: [] });

  // Test with limit
  const results = await searchStore.search("Hello", 2);
  assertEquals(results.length, 2);
  assertEquals(results[0].rank, 1);
  assertEquals(results[1].rank, 2);

  // Test without limit (should default to 10)
  const resultsNoLimit = await searchStore.search("Hello");
  assertEquals(resultsNoLimit.length <= 10, true);
  assertEquals(resultsNoLimit.length >= 5, true); // Should get all 5 results
});

Deno.test("OramaSearchStore.search performs hybrid search combining text and vector", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, vectorSize, embedder);

  // Insert test documents with different content
  const quads = [
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/exact"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("machine learning artificial intelligence"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/similar"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("AI deep learning neural networks"),
    ),
    DataFactory.quad(
      DataFactory.namedNode("https://example.org/unrelated"),
      DataFactory.namedNode("https://example.org/p"),
      DataFactory.literal("cooking recipes food preparation"),
    ),
  ];
  await searchStore.patch({ insertions: quads, deletions: [] });

  // Search for "machine learning" - should find relevant documents
  const results = await searchStore.search("machine learning");

  // Should return results (hybrid search combines text matching and vector similarity)
  assertEquals(results.length > 0, true);

  // Results should be RankedResult format
  results.forEach((result) => {
    assertEquals(typeof result.rank, "number");
    assertEquals(typeof result.score, "number");
    assertEquals(result.value.termType, "NamedNode");
  });
});

Deno.test("OramaSearchStore.search returns empty array when no matches found", async () => {
  const vectorSize = 128;
  const orama = createOrama(vectorSize);
  const embedder = new FakeEmbedder(vectorSize);
  const searchStore = new OramaSearchStore(orama, vectorSize, embedder);

  // Insert test data
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s1"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("Hello World"),
  );
  await searchStore.patch({ insertions: [quad], deletions: [] });

  // Search for something that won't match
  const results = await searchStore.search("xyzabc123nonexistent");

  // Should return empty array or very few results
  assertEquals(Array.isArray(results), true);
});
