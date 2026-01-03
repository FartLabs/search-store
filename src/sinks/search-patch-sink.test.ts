import { assertEquals } from "@std/assert";
import { DataFactory } from "n3";
import type * as rdfjs from "@rdfjs/types";
import { SearchPatchSink } from "./search-patch-sink.ts";
import type { RDFPatch } from "../core/rdf-patch.ts";
import type { SearchStore } from "../search-store.ts";

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

Deno.test("SearchPatchSink applies add patches", async () => {
  const store = new FakeSearchStore();
  const sink = new SearchPatchSink(store);

  const testQuad = quad(
    namedNode("http://example.org/subject"),
    namedNode("http://example.org/predicate"),
    literal("value"),
  );

  const patches: AsyncIterable<RDFPatch> = (async function* () {
    yield { action: "add", quad: testQuad };
  })();

  await sink.applyPatches(patches);

  assertEquals(store.addedQuads.length, 1);
  assertEquals(store.addedQuads[0], testQuad);
  assertEquals(store.removedQuads.length, 0);
});

Deno.test("SearchPatchSink applies remove patches", async () => {
  const store = new FakeSearchStore();
  const sink = new SearchPatchSink(store);

  const testQuad = quad(
    namedNode("http://example.org/subject"),
    namedNode("http://example.org/predicate"),
    literal("value"),
  );

  const patches: AsyncIterable<RDFPatch> = (async function* () {
    yield { action: "remove", quad: testQuad };
  })();

  await sink.applyPatches(patches);

  assertEquals(store.removedQuads.length, 1);
  assertEquals(store.removedQuads[0], testQuad);
  assertEquals(store.addedQuads.length, 0);
});

Deno.test("SearchPatchSink applies mixed patches in correct order", async () => {
  const store = new FakeSearchStore();
  const sink = new SearchPatchSink(store);

  const quad1 = quad(
    namedNode("http://example.org/subject1"),
    namedNode("http://example.org/predicate"),
    literal("value1"),
  );
  const quad2 = quad(
    namedNode("http://example.org/subject2"),
    namedNode("http://example.org/predicate"),
    literal("value2"),
  );
  const quad3 = quad(
    namedNode("http://example.org/subject3"),
    namedNode("http://example.org/predicate"),
    literal("value3"),
  );

  const patches: AsyncIterable<RDFPatch> = (async function* () {
    yield { action: "add", quad: quad1 };
    yield { action: "remove", quad: quad2 };
    yield { action: "add", quad: quad3 };
  })();

  await sink.applyPatches(patches);

  // Deletions should be applied first, then insertions
  assertEquals(store.removedQuads.length, 1);
  assertEquals(store.removedQuads[0], quad2);
  assertEquals(store.addedQuads.length, 2);
  assertEquals(store.addedQuads[0], quad1);
  assertEquals(store.addedQuads[1], quad3);
});

Deno.test("SearchPatchSink handles empty patch stream", async () => {
  const store = new FakeSearchStore();
  const sink = new SearchPatchSink(store);

  const patches: AsyncIterable<RDFPatch> = (async function* () {
    // No patches
  })();

  await sink.applyPatches(patches);

  assertEquals(store.addedQuads.length, 0);
  assertEquals(store.removedQuads.length, 0);
});
