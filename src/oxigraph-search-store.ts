import type * as rdfjs from "@rdfjs/types";
import type { Store } from "oxigraph";
import { quad } from "oxigraph";
import type { SearchStore } from "./search-store.ts";

/**
 * getStringLiteralsSparql is a SPARQL query that collects every string literal
 * from an RDF store.
 */
export const getStringLiteralsSparql = `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
SELECT ?s ?p ?literal
WHERE {
  ?s ?p ?literal .
  FILTER (isLiteral(?literal) && 
         (datatype(?literal) = xsd:string || datatype(?literal) = rdf:langString))
}
`;

/**
 * OxigraphSearchStoreOptions are the query options for the OxigraphSearchStore.
 */
export type OxigraphSearchStoreOptions = Parameters<Store["query"]>[1];

/**
 * OxigraphSearchStore is a search store that uses Oxigraph as the underlying RDF store.
 */
export class OxigraphSearchStore<TQuad extends rdfjs.BaseQuad = rdfjs.Quad>
  implements SearchStore<TQuad> {
  public constructor(
    private readonly store: Store,
    private readonly options?: OxigraphSearchStoreOptions,
  ) {}

  public async *getStringLiterals(): AsyncIterable<TQuad> {
    const result = this.store.query(getStringLiteralsSparql, this.options);

    if (Array.isArray(result)) {
      for (const binding of result) {
        if (binding instanceof Map) {
          const s = binding.get("s");
          const p = binding.get("p");
          const literal = binding.get("literal");

          if (s && p && literal) {
            // Type assertion: s and p are subjects/predicates (NamedNode or BlankNode),
            // literal is a Literal as filtered by the SPARQL query.
            // The oxigraph quad function has strict types, but query results are Term | undefined.
            // We know at runtime these are the correct types.
            yield quad(
              s as unknown as Parameters<typeof quad>[0],
              p as unknown as Parameters<typeof quad>[1],
              literal as unknown as Parameters<typeof quad>[2],
            ) as TQuad;
          }
        }
      }
    }
  }
}
