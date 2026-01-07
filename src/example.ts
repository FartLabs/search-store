import { DataFactory as N3DataFactory, Store } from "n3";
import { RandomEmbedder } from "./embedder.ts";
import { createOrama, OramaSearchStore } from "./orama.ts";
import { proxyN3 } from "./n3.ts";
import solarSytemSparql from "./solar-system.sparql" with { type: "text" };

const vectorSize = 128;
const orama = createOrama(vectorSize);

const embedder = new RandomEmbedder(vectorSize);

const searchStore = new OramaSearchStore({
  dataFactory: N3DataFactory,
  embedder,
  orama,
});

const n3Store = new Store();
const patchProxy = proxyN3(n3Store, searchStore);

patchProxy.update(solarSytemSparql);

await searchStore.pull();

const rankedResults = await searchStore.search(
  "What is the name of the planet with the largest radius?",
);

console.log({ rankedResults });

// Store patches with sparql query and then pull and push those patches to the document store
