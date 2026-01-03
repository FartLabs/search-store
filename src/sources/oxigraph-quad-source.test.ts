import { assertEquals } from "@std/assert";
import { Store } from "oxigraph";
import type * as rdfjs from "@rdfjs/types";
import { OxigraphQuadSource } from "./oxigraph-quad-source.ts";

Deno.test("OxigraphQuadSource.snapshot returns quads from store", async () => {
  const store = new Store();
  // Use Oxigraph's native quad creation (TypeScript definitions may be incomplete)
  const storeAny = store as any;
  const subject = storeAny.namedNode("http://example.org/subject");
  const predicate = storeAny.namedNode("http://example.org/predicate");
  const object = storeAny.literal("value");
  const testQuad = storeAny.quad(subject, predicate, object);
  store.add(testQuad);

  const source = new OxigraphQuadSource(store);
  const quads: rdfjs.Quad[] = [];
  for await (const q of source.snapshot()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  assertEquals(quads[0].subject.value, testQuad.subject.value);
  assertEquals(quads[0].predicate.value, testQuad.predicate.value);
  assertEquals(quads[0].object.value, testQuad.object.value);
});

Deno.test("OxigraphQuadSource.snapshot respects filter", async () => {
  const store = new Store();
  // Use Oxigraph's native quad creation (TypeScript definitions may be incomplete)
  const storeAny = store as any;
  const subject1 = storeAny.namedNode("http://example.org/subject1");
  const subject2 = storeAny.namedNode("http://example.org/subject2");
  const predicate = storeAny.namedNode("http://example.org/predicate");
  const stringObject = storeAny.literal(
    "string value",
    storeAny.namedNode("http://www.w3.org/2001/XMLSchema#string"),
  );
  const nonStringObject = storeAny.namedNode("http://example.org/object");

  const stringQuad = storeAny.quad(subject1, predicate, stringObject);
  const nonStringQuad = storeAny.quad(subject2, predicate, nonStringObject);

  store.add(stringQuad);
  store.add(nonStringQuad);

  const source = new OxigraphQuadSource(store);
  const quads: rdfjs.Quad[] = [];
  for await (const q of source.snapshot({ objectType: "string" })) {
    quads.push(q);
  }

  // Should only return string literals
  assertEquals(quads.length, 1);
  assertEquals(quads[0].subject.value, stringQuad.subject.value);
});
