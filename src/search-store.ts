import type * as rdfjs from "@rdfjs/types";

/**
 * SearchStore is a search store that enables efficient searching of RDF data.
 */
export interface SearchStore<TQuad extends rdfjs.BaseQuad = rdfjs.Quad> {
  /**
   * getStringLiterals returns an async iterator that yields all string
   * literals in the store.
   */
  getStringLiterals(): AsyncIterable<TQuad>;
}
