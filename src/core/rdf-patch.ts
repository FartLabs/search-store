import type * as rdfjs from "@rdfjs/types";

/**
 * RDFPatch represents a single atomic change to an RDF graph.
 *
 * This follows a simplified patch model where each patch represents one quad
 * with an action, making the API more direct and easier to work with.
 *
 * Inspired by the Equinor rdf-graph library's approach.
 */
export interface RDFPatch {
  /**
   * action indicates whether the quad should be added or removed.
   */
  action: "add" | "remove";

  /**
   * quad is the quad that should be added or removed.
   */
  quad: rdfjs.Quad;
}

/**
 * RDFDelta is an alias for RDFPatch, following common naming conventions
 * in live synchronization systems.
 */
export type RDFDelta = RDFPatch;
