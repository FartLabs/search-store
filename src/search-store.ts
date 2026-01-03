import type * as rdfjs from "@rdfjs/types";

/**
 * SearchStore is a search store that enables efficient searching of RDF data.
 *
 * This interface adapts RDF quads to search store documents.
 */
export interface SearchStore {
  /**
   * addQuad adds a quad to the RDF store.
   */
  addQuad(quad: rdfjs.Quad): Promise<void>;

  /**
   * addQuads adds multiple quads to the RDF store.
   */
  addQuads(quads: rdfjs.Quad[]): Promise<void>;

  /**
   * removeQuad removes a quad from the RDF store.
   */
  removeQuad(quad: rdfjs.Quad): Promise<void>;

  /**
   * removeQuads removes multiple quads from the RDF store.
   */
  removeQuads(quads: rdfjs.Quad[]): Promise<void>;
}
