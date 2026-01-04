import { assertEquals } from "@std/assert";
import { DataFactory, Store } from "n3";
import type { Patch } from "../patch.ts";
import { createN3Proxy } from "./proxy.ts";

Deno.test("createN3Proxy notifies subscribers when addQuad is called", () => {
  const store = new Store();
  const patches: Patch[] = [];
  const patchSource = {
    emit(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createN3Proxy(store, patchSource);

  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o"),
  );

  proxiedStore.addQuad(quad);

  assertEquals(patches.length, 1);
  assertEquals(patches[0].insertions.length, 1);
  assertEquals(patches[0].insertions[0], quad);
  assertEquals(patches[0].deletions.length, 0);
  assertEquals(store.size, 1);
});

Deno.test("createN3Proxy notifies subscribers when addQuads is called", () => {
  const store = new Store();
  const patches: Patch[] = [];
  const patchSource = {
    emit(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createN3Proxy(store, patchSource);

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

  proxiedStore.addQuads([quad1, quad2]);

  assertEquals(patches.length, 1);
  assertEquals(patches[0].insertions.length, 2);
  assertEquals(patches[0].insertions[0], quad1);
  assertEquals(patches[0].insertions[1], quad2);
  assertEquals(patches[0].deletions.length, 0);
  assertEquals(store.size, 2);
});

Deno.test("createN3Proxy notifies subscribers when removeQuad is called", () => {
  const store = new Store();
  const patches: Patch[] = [];
  const patchSource = {
    emit(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createN3Proxy(store, patchSource);

  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o"),
  );

  proxiedStore.addQuad(quad);
  patches.length = 0; // Clear patches

  proxiedStore.removeQuad(quad);

  assertEquals(patches.length, 1);
  assertEquals(patches[0].deletions.length, 1);
  assertEquals(patches[0].deletions[0], quad);
  assertEquals(patches[0].insertions.length, 0);
  assertEquals(store.size, 0);
});

Deno.test("createN3Proxy notifies subscribers when removeQuads is called", () => {
  const store = new Store();
  const patches: Patch[] = [];
  const patchSource = {
    emit(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createN3Proxy(store, patchSource);

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

  proxiedStore.addQuads([quad1, quad2]);
  patches.length = 0; // Clear patches

  proxiedStore.removeQuads([quad1, quad2]);

  assertEquals(patches.length, 1);
  assertEquals(patches[0].deletions.length, 2);
  assertEquals(patches[0].deletions[0], quad1);
  assertEquals(patches[0].deletions[1], quad2);
  assertEquals(patches[0].insertions.length, 0);
  assertEquals(store.size, 0);
});

Deno.test("createN3Proxy notifies all subscribers", () => {
  const store = new Store();
  const patches1: Patch[] = [];
  const patches2: Patch[] = [];
  const patchSource = {
    emit(patch: Patch): Promise<void> {
      patches1.push(patch);
      patches2.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createN3Proxy(store, patchSource);

  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o"),
  );

  proxiedStore.addQuad(quad);

  assertEquals(patches1.length, 1);
  assertEquals(patches2.length, 1);
  assertEquals(patches1[0].insertions[0], quad);
  assertEquals(patches2[0].insertions[0], quad);
});

Deno.test("createN3Proxy forwards non-mutating methods correctly", () => {
  const store = new Store();
  const patches: Patch[] = [];
  const patchSource = {
    emit(patch: Patch): Promise<void> {
      patches.push(patch);
      return Promise.resolve();
    },
  };

  const proxiedStore = createN3Proxy(store, patchSource);

  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("o"),
  );

  store.addQuad(quad);

  // getQuads should not trigger patches
  const quads = proxiedStore.getQuads(null, null, null, null);
  assertEquals(quads.length, 1);
  assertEquals(patches.length, 0);

  // size should work
  assertEquals(proxiedStore.size, 1);
});
