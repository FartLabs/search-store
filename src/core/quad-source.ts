import type * as rdfjs from "@rdfjs/types";

/**
 * QuadFilter defines criteria for filtering quads.
 */
export interface QuadFilter {
  /**
   * objectType filters quads by object literal type.
   * - 'string': only xsd:string literals
   * - 'langString': only rdf:langString literals
   * - 'all': all literal types (default)
   */
  objectType?: "string" | "langString" | "all";
}

/**
 * QuadSource produces quads as snapshots.
 */
export interface QuadSource {
  /**
   * snapshot returns all quads matching the filter criteria.
   */
  snapshot(filter?: QuadFilter): AsyncIterable<rdfjs.Quad>;
}
