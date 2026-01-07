import { DataFactory, Store } from "n3";
import { QueryEngine } from "@comunica/query-sparql-rdfjs-lite";
import { proxyN3 } from "#/n3.ts";
import { createOrama, OramaSearchStore } from "./orama.ts";
import { ZeroEmbedder } from "./embedder.ts";
import solarSystemSparql from "./solar-system.sparql" with { type: "text" };

// Create a text embedder.
const vectorSize = 1;
const embedder = new ZeroEmbedder(vectorSize);

// Create search store.
const orama = createOrama(vectorSize);
const searchStore = new OramaSearchStore({
  dataFactory: DataFactory,
  orama,
  embedder,
  mode: "fulltext",
});

// Create an RDF store and connect it to the search store.
const n3Store = new Store();
const patchProxy = proxyN3(n3Store, searchStore);

// Create a query engine.
const queryEngine = new QueryEngine();

// Ensure the query executes.
const queryResult = await queryEngine.query(solarSystemSparql, {
  sources: [patchProxy],
});
await queryResult.execute();

// Sync the search store with the RDF store.
await searchStore.pull();

// Search the search store.
const query = "What is the name of the planet with the largest radius?";
console.log(`> ${query}`);

const rankedResults = await searchStore.search(query);
console.table(rankedResults);
