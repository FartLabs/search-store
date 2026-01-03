import { assertEquals } from "@std/assert";
import { Store } from "n3";
import { DataFactory } from "n3";
import type * as rdfjs from "@rdfjs/types";
import { N3QuadSource } from "./n3-quad-source.ts";

const { quad, namedNode, literal } = DataFactory;

Deno.test("N3QuadSource.snapshot returns quads from store", async () => {
  const store = new Store();
  const testQuad = quad(
    namedNode("http://example.org/subject"),
    namedNode("http://example.org/predicate"),
    literal("value"),
  );
  store.add(testQuad);

  const source = new N3QuadSource(store);
  const quads: rdfjs.Quad[] = [];
  for await (const q of source.snapshot()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  // Compare by value since N3 quads are compatible with RDFJS
  assertEquals(quads[0].subject.value, testQuad.subject.value);
  assertEquals(quads[0].predicate.value, testQuad.predicate.value);
  assertEquals(quads[0].object.value, testQuad.object.value);
});

Deno.test("N3QuadSource.snapshot respects filter", async () => {
  const store = new Store();
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
  store.add(stringQuad);
  store.add(langStringQuad);

  const source = new N3QuadSource(store);
  const quads: rdfjs.Quad[] = [];
  for await (const q of source.snapshot({ objectType: "string" })) {
    quads.push(q);
  }

  // Should only return string literals
  assertEquals(quads.length, 1);
  assertEquals(quads[0].subject.value, stringQuad.subject.value);
  assertEquals(quads[0].object.value, stringQuad.object.value);
});
