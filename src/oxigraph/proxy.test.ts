import { assertEquals } from "@std/assert";
import oxigraph from "oxigraph";
import type { Patch } from "#/rdf-patch/rdf-patch.ts";
import { createOxigraphProxy } from "./proxy.ts";

Deno.test("createOxigraphProxy notifies subscribers when add is called", () => {
  const store = new oxigraph.Store();
  const patches: Patch[] = [];
  const patchSink = {
    patch(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createOxigraphProxy(store, patchSink);

  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o"),
  );

  proxiedStore.add(quad);

  assertEquals(patches.length, 1);
  assertEquals(patches[0].insertions.length, 1);
  assertEquals(patches[0].insertions[0], quad);
  assertEquals(patches[0].deletions.length, 0);
  assertEquals(store.has(quad), true);
});

Deno.test("createOxigraphProxy notifies subscribers when delete is called", () => {
  const store = new oxigraph.Store();
  const patches: Patch[] = [];
  const patchSink = {
    patch(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createOxigraphProxy(store, patchSink);

  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o"),
  );

  proxiedStore.add(quad);
  patches.length = 0; // Clear patches

  proxiedStore.delete(quad);

  assertEquals(patches.length, 1);
  assertEquals(patches[0].deletions.length, 1);
  assertEquals(patches[0].deletions[0], quad);
  assertEquals(patches[0].insertions.length, 0);
  assertEquals(store.has(quad), false);
});

Deno.test("createOxigraphProxy notifies all subscribers", () => {
  const store = new oxigraph.Store();
  const patches1: Patch[] = [];
  const patches2: Patch[] = [];
  const patchSink = {
    patch(patch: Patch): Promise<void> {
      patches1.push(patch);
      patches2.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createOxigraphProxy(store, patchSink);

  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o"),
  );

  proxiedStore.add(quad);

  assertEquals(patches1.length, 1);
  assertEquals(patches2.length, 1);
  assertEquals(patches1[0].insertions[0], quad);
  assertEquals(patches2[0].insertions[0], quad);
});

Deno.test("createOxigraphProxy forwards non-mutating methods correctly", () => {
  const store = new oxigraph.Store();
  const patches: Patch[] = [];
  const patchSink = {
    patch(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createOxigraphProxy(store, patchSink);

  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("o"),
  );

  store.add(quad);

  // match should not trigger patches
  const quads = proxiedStore.match(null, null, null, null);
  assertEquals(quads.length, 1);
  assertEquals(patches.length, 0);

  // has should work
  assertEquals(proxiedStore.has(quad), true);
});
