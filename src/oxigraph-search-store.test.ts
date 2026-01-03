import { assertEquals } from "@std/assert";
import { literal, namedNode, quad, Store } from "oxigraph";
import { OxigraphSearchStore } from "./oxigraph-search-store.ts";

Deno.test("OxigraphSearchStore gets string literals", async () => {
  const store = new Store();
  store.add(
    quad(
      namedNode("https://etok.me"),
      namedNode("http://schema.org/givenName"),
      literal("Ethan"),
    ),
  );

  const searchStore = new OxigraphSearchStore(store);
  const quads = await Array.fromAsync(searchStore.getStringLiterals());
  assertEquals(quads.length, 1);

  console.dir(quads, { depth: null });
});
