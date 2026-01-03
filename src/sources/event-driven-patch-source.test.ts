import { assertEquals } from "@std/assert";
import { Store } from "oxigraph";
import { DataFactory } from "n3";
import type * as rdfjs from "@rdfjs/types";
import {
  type PatchCallbackSource,
  PatchSource,
} from "./event-driven-patch-source.ts";
import type { RDFPatch } from "../core/rdf-patch.ts";
import type { QuadFilter } from "../core/quad-source.ts";

const { quad, namedNode, literal } = DataFactory;

/**
 * OxigraphStoreAdapter adapts Oxigraph Store to work with PatchSource.
 * Handles the query return type conversion.
 */
class OxigraphStoreAdapter {
  constructor(private store: Store) {}

  query(query: string, options?: unknown): rdfjs.Quad[] {
    // Type assertion needed because Oxigraph's query options type is complex
    const result = this.store.query(query, options as any);
    // Oxigraph query returns Quad[] for CONSTRUCT queries
    return result as rdfjs.Quad[];
  }
}

class FakePatchCallbackSource implements PatchCallbackSource {
  private handlers: Array<(patch: RDFPatch) => void> = [];

  onPatch(callback: (patch: RDFPatch) => void): () => void {
    this.handlers.push(callback);
    return () => {
      const index = this.handlers.indexOf(callback);
      if (index > -1) {
        this.handlers.splice(index, 1);
      }
    };
  }

  emit(patch: RDFPatch): void {
    for (const handler of this.handlers) {
      handler(patch);
    }
  }
}

Deno.test("PatchSource.snapshot returns quads", async () => {
  const store = new Store();
  // Use Oxigraph's native quad creation (TypeScript definitions may be incomplete)
  const storeAny = store as any;
  const subject = storeAny.namedNode("http://example.org/subject");
  const predicate = storeAny.namedNode("http://example.org/predicate");
  const object = storeAny.literal("value");
  const testQuad = storeAny.quad(subject, predicate, object);
  store.add(testQuad);

  const storeAdapter = new OxigraphStoreAdapter(store);
  const callbackSource = new FakePatchCallbackSource();
  const source = new PatchSource(storeAdapter, callbackSource);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.snapshot()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  assertEquals(quads[0].subject.value, testQuad.subject.value);
  assertEquals(quads[0].predicate.value, testQuad.predicate.value);
  assertEquals(quads[0].object.value, testQuad.object.value);
});

Deno.test("PatchSource.patches yields patches from callbacks", async () => {
  const store = new Store();
  const storeAdapter = new OxigraphStoreAdapter(store);
  const callbackSource = new FakePatchCallbackSource();
  const source = new PatchSource(storeAdapter, callbackSource);

  const testQuad = quad(
    namedNode("http://example.org/subject"),
    namedNode("http://example.org/predicate"),
    literal("value"),
  );

  const patches: RDFPatch[] = [];
  const patchesPromise = (async () => {
    for await (const patch of source.patches()) {
      patches.push(patch);
      if (patches.length >= 2) {
        break;
      }
    }
  })();

  // Emit patches via callbacks and wait for processing
  callbackSource.emit({ action: "add", quad: testQuad });
  await new Promise((resolve) => setTimeout(resolve, 10));

  callbackSource.emit({ action: "remove", quad: testQuad });
  await new Promise((resolve) => setTimeout(resolve, 10));

  await patchesPromise;

  assertEquals(patches.length, 2);
  assertEquals(patches[0].action, "add");
  assertEquals(patches[0].quad.subject.value, testQuad.subject.value);
  assertEquals(patches[1].action, "remove");
  assertEquals(patches[1].quad.subject.value, testQuad.subject.value);
});

Deno.test("PatchSource.patches filters by objectType", async () => {
  const store = new Store();
  const storeAdapter = new OxigraphStoreAdapter(store);
  const callbackSource = new FakePatchCallbackSource();
  const source = new PatchSource(storeAdapter, callbackSource);

  const stringQuad = quad(
    namedNode("http://example.org/subject1"),
    namedNode("http://example.org/predicate"),
    literal(
      "string value",
      namedNode("http://www.w3.org/2001/XMLSchema#string"),
    ),
  );
  const langStringQuad = quad(
    namedNode("http://example.org/subject2"),
    namedNode("http://example.org/predicate"),
    literal("lang value", "en"),
  );

  const filter: QuadFilter = { objectType: "string" };
  const patches: RDFPatch[] = [];
  const patchesPromise = (async () => {
    for await (const patch of source.patches(filter)) {
      patches.push(patch);
      if (patches.length >= 1) {
        break;
      }
    }
  })();

  // Emit patches via callbacks - only string should pass filter
  callbackSource.emit({ action: "add", quad: stringQuad });
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Emit langString - should be filtered out
  callbackSource.emit({ action: "add", quad: langStringQuad });
  await new Promise((resolve) => setTimeout(resolve, 10));

  await patchesPromise;

  assertEquals(patches.length, 1);
  assertEquals(patches[0].quad.subject.value, stringQuad.subject.value);
});
