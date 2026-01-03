import { assertEquals } from "@std/assert";
import type * as rdfjs from "@rdfjs/types";
import { DataFactory } from "n3";
import type { RDFPatch } from "./rdf-patch.ts";

const { quad, namedNode, literal } = DataFactory;

Deno.test("RDFPatch structure", () => {
  const testQuad = quad(
    namedNode("http://example.org/subject"),
    namedNode("http://example.org/predicate"),
    literal("value"),
  );

  const addPatch: RDFPatch = {
    action: "add",
    quad: testQuad,
  };

  const removePatch: RDFPatch = {
    action: "remove",
    quad: testQuad,
  };

  assertEquals(addPatch.action, "add");
  assertEquals(addPatch.quad, testQuad);
  assertEquals(removePatch.action, "remove");
  assertEquals(removePatch.quad, testQuad);
});
