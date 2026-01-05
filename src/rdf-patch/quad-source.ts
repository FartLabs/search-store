import type * as rdfjs from "@rdfjs/types";

/**
 * QuadSource is a source that can provide quads.
 */
export interface QuadSource {
  /**
   * getQuads returns the complete state of the source as an AsyncIterable of quads.
   */
  getQuads(): AsyncIterable<rdfjs.Quad>;
}
