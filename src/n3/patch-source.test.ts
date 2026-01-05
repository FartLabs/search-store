import { assertEquals } from "@std/assert";
import { DataFactory, Store } from "n3";
import type { Patch } from "#/rdf-patch/rdf-patch.ts";
import { N3PatchSource } from "./patch-source.ts";

Deno.test("N3PatchSource.subscribe notifies subscribers when patches are received", async () => {
  const store = new Store();
  const patchSource = new N3PatchSource(store);

  const receivedPatches: Patch[] = [];
  const unsubscribe = patchSource.subscribe((patch) => {
    receivedPatches.push(patch);
  });

  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o"),
  );

  // Add a quad through the proxied store, which should trigger a patch
  patchSource.store.addQuad(quad);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(receivedPatches.length, 1);
  assertEquals(receivedPatches[0].insertions.length, 1);
  assertEquals(receivedPatches[0].insertions[0], quad);
  assertEquals(receivedPatches[0].deletions.length, 0);

  unsubscribe();
});

Deno.test("N3PatchSource.subscribe supports multiple subscribers", async () => {
  const store = new Store();
  const patchSource = new N3PatchSource(store);

  const receivedPatches1: Patch[] = [];
  const receivedPatches2: Patch[] = [];

  const unsubscribe1 = patchSource.subscribe((patch) => {
    receivedPatches1.push(patch);
  });
  const unsubscribe2 = patchSource.subscribe((patch) => {
    receivedPatches2.push(patch);
  });

  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o"),
  );

  patchSource.store.addQuad(quad);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(receivedPatches1.length, 1);
  assertEquals(receivedPatches2.length, 1);
  assertEquals(receivedPatches1[0].insertions[0], quad);
  assertEquals(receivedPatches2[0].insertions[0], quad);

  unsubscribe1();
  unsubscribe2();
});

Deno.test("N3PatchSource.subscribe unsubscribe stops receiving patches", async () => {
  const store = new Store();
  const patchSource = new N3PatchSource(store);

  const receivedPatches: Patch[] = [];
  const unsubscribe = patchSource.subscribe((patch) => {
    receivedPatches.push(patch);
  });

  const quad1 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s1"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o1"),
  );

  patchSource.store.addQuad(quad1);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(receivedPatches.length, 1);

  // Unsubscribe
  unsubscribe();

  const quad2 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s2"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o2"),
  );

  patchSource.store.addQuad(quad2);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Should still only have 1 patch (the one before unsubscribe)
  assertEquals(receivedPatches.length, 1);
});

Deno.test("N3PatchSource.subscribe supports async subscribers", async () => {
  const store = new Store();
  const patchSource = new N3PatchSource(store);

  const receivedPatches: Patch[] = [];
  const processingOrder: number[] = [];
  let processingCount = 0;

  patchSource.subscribe(async (patch) => {
    const currentCount = ++processingCount;
    processingOrder.push(currentCount);
    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, 10));
    receivedPatches.push(patch);
  });

  const quad1 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s1"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o1"),
  );
  const quad2 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s2"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o2"),
  );

  patchSource.store.addQuad(quad1);
  patchSource.store.addQuad(quad2);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 50));

  assertEquals(receivedPatches.length, 2);
  assertEquals(processingOrder.length, 2);
  // Patches should be processed sequentially
  assertEquals(processingOrder[0], 1);
  assertEquals(processingOrder[1], 2);
});
