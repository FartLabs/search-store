import { assert, assertEquals } from "@std/assert";
import { DataFactory, Store } from "n3";
import type * as rdfjs from "@rdfjs/types";
import { N3QuadSource } from "./quad-source.ts";

Deno.test("N3QuadSource.getQuads includes language-tagged literals (rdf:langString)", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add a language-tagged literal
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.literal("Hello", "en"),
  );
  await store.addQuad(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  assertEquals(quads[0], quad);
});

Deno.test("N3QuadSource.getQuads includes plain literals (no datatype)", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add a plain literal (no datatype)
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.literal("Hello"),
  );
  await store.addQuad(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  assertEquals(quads[0], quad);
});

Deno.test("N3QuadSource.getQuads includes typed string literals (xsd:string)", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add a typed string literal
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.literal(
      "Hello",
      DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string"),
    ),
  );
  await store.addQuad(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  assertEquals(quads[0], quad);
});

Deno.test("N3QuadSource.getQuads excludes non-string typed literals (xsd:integer)", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add a typed integer literal
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.literal(
      "42",
      DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer"),
    ),
  );
  await store.addQuad(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("N3QuadSource.getQuads excludes non-string typed literals (xsd:boolean)", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add a typed boolean literal
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.literal(
      "true",
      DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
    ),
  );
  await store.addQuad(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("N3QuadSource.getQuads excludes non-literal objects (NamedNode)", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add a quad with a NamedNode as object
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.namedNode("https://example.org/object"),
  );
  await store.addQuad(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("N3QuadSource.getQuads excludes non-literal objects (BlankNode)", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add a quad with a BlankNode as object
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.blankNode("b1"),
  );
  await store.addQuad(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("N3QuadSource.getQuads filters mixed quads correctly", async () => {
  const store = new Store();
  const source = new N3QuadSource(store);

  // Add various types of quads
  const stringQuad1 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s1"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("Hello", "en"), // language-tagged
  );
  const stringQuad2 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s2"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal("World"), // plain literal
  );
  const stringQuad3 = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s3"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal(
      "Test",
      DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string"),
    ), // typed string
  );
  const integerQuad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s4"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.literal(
      "42",
      DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#integer"),
    ), // typed integer
  );
  const namedNodeQuad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/s5"),
    DataFactory.namedNode("https://example.org/p"),
    DataFactory.namedNode("https://example.org/o"), // NamedNode
  );

  await store.addQuad(stringQuad1);
  await store.addQuad(stringQuad2);
  await store.addQuad(stringQuad3);
  await store.addQuad(integerQuad);
  await store.addQuad(namedNodeQuad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 3);

  // Helper to check if a quad matches by comparing its object value
  const hasQuadWithObject = (quads: rdfjs.Quad[], expectedObject: string) => {
    return quads.some((q: rdfjs.Quad) =>
      q.object.termType === "Literal" && q.object.value === expectedObject
    );
  };

  // Verify all three string quads are included by checking their object values
  assert(hasQuadWithObject(quads, "Hello"));
  assert(hasQuadWithObject(quads, "World"));
  assert(hasQuadWithObject(quads, "Test"));

  // Verify non-string quads are excluded
  assert(!hasQuadWithObject(quads, "42"));
  // Check that no quads have NamedNode objects
  assert(
    !quads.some((q: rdfjs.Quad) => q.object.termType === "NamedNode"),
  );
});
