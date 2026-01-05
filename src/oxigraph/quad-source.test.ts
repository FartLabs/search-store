import { assert, assertEquals } from "@std/assert";
import oxigraph from "oxigraph";
import type * as rdfjs from "@rdfjs/types";
import { OxigraphQuadSource } from "./quad-source.ts";

Deno.test("OxigraphQuadSource.getQuads includes language-tagged literals (rdf:langString)", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add a language-tagged literal
  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/subject"),
    oxigraph.namedNode("https://example.org/predicate"),
    oxigraph.literal("Hello", "en"),
  );
  store.add(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  // Compare quad properties since Oxigraph quads are WebAssembly objects
  assertEquals(quads[0].subject.value, quad.subject.value);
  assertEquals(quads[0].predicate.value, quad.predicate.value);
  assertEquals(quads[0].object.value, quad.object.value);
  if (
    quads[0].object.termType === "Literal" && quad.object.termType === "Literal"
  ) {
    assertEquals(quads[0].object.language, quad.object.language);
  }
});

Deno.test("OxigraphQuadSource.getQuads includes plain literals (no datatype)", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add a plain literal (no datatype)
  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/subject"),
    oxigraph.namedNode("https://example.org/predicate"),
    oxigraph.literal("Hello"),
  );
  store.add(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  // Compare quad properties since Oxigraph quads are WebAssembly objects
  assertEquals(quads[0].subject.value, quad.subject.value);
  assertEquals(quads[0].predicate.value, quad.predicate.value);
  assertEquals(quads[0].object.value, quad.object.value);
});

Deno.test("OxigraphQuadSource.getQuads includes typed string literals (xsd:string)", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add a typed string literal
  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/subject"),
    oxigraph.namedNode("https://example.org/predicate"),
    oxigraph.literal(
      "Hello",
      oxigraph.namedNode("http://www.w3.org/2001/XMLSchema#string"),
    ),
  );
  store.add(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 1);
  // Compare quad properties since Oxigraph quads are WebAssembly objects
  assertEquals(quads[0].subject.value, quad.subject.value);
  assertEquals(quads[0].predicate.value, quad.predicate.value);
  assertEquals(quads[0].object.value, quad.object.value);
  if (
    quads[0].object.termType === "Literal" && quad.object.termType === "Literal"
  ) {
    assertEquals(quads[0].object.datatype?.value, quad.object.datatype?.value);
  }
});

Deno.test("OxigraphQuadSource.getQuads excludes non-string typed literals (xsd:integer)", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add a typed integer literal
  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/subject"),
    oxigraph.namedNode("https://example.org/predicate"),
    oxigraph.literal(
      "42",
      oxigraph.namedNode("http://www.w3.org/2001/XMLSchema#integer"),
    ),
  );
  store.add(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("OxigraphQuadSource.getQuads excludes non-string typed literals (xsd:boolean)", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add a typed boolean literal
  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/subject"),
    oxigraph.namedNode("https://example.org/predicate"),
    oxigraph.literal(
      "true",
      oxigraph.namedNode("http://www.w3.org/2001/XMLSchema#boolean"),
    ),
  );
  store.add(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("OxigraphQuadSource.getQuads excludes non-literal objects (NamedNode)", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add a quad with a NamedNode as object
  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/subject"),
    oxigraph.namedNode("https://example.org/predicate"),
    oxigraph.namedNode("https://example.org/object"),
  );
  store.add(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("OxigraphQuadSource.getQuads excludes non-literal objects (BlankNode)", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add a quad with a BlankNode as object
  const quad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/subject"),
    oxigraph.namedNode("https://example.org/predicate"),
    oxigraph.blankNode("b1"),
  );
  store.add(quad);

  const quads: rdfjs.Quad[] = [];
  for await (const q of source.getQuads()) {
    quads.push(q);
  }

  assertEquals(quads.length, 0);
});

Deno.test("OxigraphQuadSource.getQuads filters mixed quads correctly", async () => {
  const store = new oxigraph.Store();
  const source = new OxigraphQuadSource(store);

  // Add various types of quads
  const stringQuad1 = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s1"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("Hello", "en"), // language-tagged
  );
  const stringQuad2 = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s2"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal("World"), // plain literal
  );
  const stringQuad3 = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s3"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal(
      "Test",
      oxigraph.namedNode("http://www.w3.org/2001/XMLSchema#string"),
    ), // typed string
  );
  const integerQuad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s4"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.literal(
      "42",
      oxigraph.namedNode("http://www.w3.org/2001/XMLSchema#integer"),
    ), // typed integer
  );
  const namedNodeQuad = oxigraph.quad(
    oxigraph.namedNode("https://example.org/s5"),
    oxigraph.namedNode("https://example.org/p"),
    oxigraph.namedNode("https://example.org/o"), // NamedNode
  );

  store.add(stringQuad1);
  store.add(stringQuad2);
  store.add(stringQuad3);
  store.add(integerQuad);
  store.add(namedNodeQuad);

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
