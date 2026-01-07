import * as rdfjs from "@rdfjs/types";
import * as oxigraph from "oxigraph";
import { RandomEmbedder } from "./embedder.ts";
import { createOrama, OramaSearchStore } from "./orama.ts";
import { proxyOxigraph } from "./oxigraph.ts";
import solarSytemSparql from "./solar-system.sparql" with { type: "text" };

const vectorSize = 128;
const orama = createOrama(vectorSize);

const embedder = new RandomEmbedder(vectorSize);

const dataFactory = oxigraph as rdfjs.DataFactory;
const searchStore = new OramaSearchStore({ dataFactory, embedder, orama });

const oxigraphStore = new oxigraph.Store();
const patchProxy = proxyOxigraph(oxigraphStore, searchStore);

patchProxy.update(solarSytemSparql);

await searchStore.pull();

const rankedResults = await searchStore.search(
  "What is the name of the planet with the largest radius?",
);

console.log({ rankedResults });

// Store patches with sparql query and then pull and push those patches to the document store
