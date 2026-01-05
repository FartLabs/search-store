import { assertEquals } from "@std/assert";
import oxigraph from "oxigraph";
import type { Patch } from "#/rdf-patch/rdf-patch.ts";
import { OxigraphPatchSource } from "./patch-source.ts";

Deno.test("OxigraphPatchSource.subscribe notifies subscribers when patches are received", async () => {
  const store = new oxigraph.Store();
  const patchSource = new OxigraphPatchSource(store);

  const receivedPatches: Patch[] = [];
  const unsubscribe = patchSource.subscribe((patch) => {
    receivedPatches.push(patch);
  });

  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o"),
  );

  // Add a quad through the proxied store, which should trigger a patch
  patchSource.store.add(quad);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(receivedPatches.length, 1);
  assertEquals(receivedPatches[0].insertions.length, 1);
  assertEquals(receivedPatches[0].insertions[0], quad);
  assertEquals(receivedPatches[0].deletions.length, 0);

  unsubscribe();
});

Deno.test("OxigraphPatchSource.subscribe supports multiple subscribers", async () => {
  const store = new oxigraph.Store();
  const patchSource = new OxigraphPatchSource(store);

  const receivedPatches1: Patch[] = [];
  const receivedPatches2: Patch[] = [];

  const unsubscribe1 = patchSource.subscribe((patch) => {
    receivedPatches1.push(patch);
  });
  const unsubscribe2 = patchSource.subscribe((patch) => {
    receivedPatches2.push(patch);
  });

  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o"),
  );

  patchSource.store.add(quad);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(receivedPatches1.length, 1);
  assertEquals(receivedPatches2.length, 1);
  assertEquals(receivedPatches1[0].insertions[0], quad);
  assertEquals(receivedPatches2[0].insertions[0], quad);

  unsubscribe1();
  unsubscribe2();
});

Deno.test("OxigraphPatchSource.subscribe unsubscribe stops receiving patches", async () => {
  const store = new oxigraph.Store();
  const patchSource = new OxigraphPatchSource(store);

  const receivedPatches: Patch[] = [];
  const unsubscribe = patchSource.subscribe((patch) => {
    receivedPatches.push(patch);
  });

  const quad1 = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s1"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o1"),
  );

  patchSource.store.add(quad1);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  assertEquals(receivedPatches.length, 1);

  // Unsubscribe
  unsubscribe();

  const quad2 = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s2"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o2"),
  );

  patchSource.store.add(quad2);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Should still only have 1 patch (the one before unsubscribe)
  assertEquals(receivedPatches.length, 1);
});

Deno.test("OxigraphPatchSource.subscribe supports async subscribers", async () => {
  const store = new oxigraph.Store();
  const patchSource = new OxigraphPatchSource(store);

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

  const quad1 = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s1"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o1"),
  );
  const quad2 = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s2"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o2"),
  );

  patchSource.store.add(quad1);
  patchSource.store.add(quad2);

  // Wait for async processing
  await new Promise((resolve) => setTimeout(resolve, 50));

  assertEquals(receivedPatches.length, 2);
  assertEquals(processingOrder.length, 2);
  // Patches should be processed sequentially
  assertEquals(processingOrder[0], 1);
  assertEquals(processingOrder[1], 2);
});
