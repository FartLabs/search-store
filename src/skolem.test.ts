import { assert, assertEquals } from "@std/assert";
import { DataFactory } from "n3";
import { skolemizeQuad } from "./skolem.ts";

Deno.test("skolemizeQuad returns a base64url-encoded string", async () => {
  const quad = DataFactory.quad(
    DataFactory.namedNode("https://example.org/subject"),
    DataFactory.namedNode("https://example.org/predicate"),
    DataFactory.literal("object value"),
  );

  const result = await skolemizeQuad(quad);

  // Verify it's a non-empty string.
  assertEquals(typeof result, "string");
  assert(result !== "");
});
