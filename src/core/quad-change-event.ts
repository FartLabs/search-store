import type * as rdfjs from "@rdfjs/types";

/**
 * QuadChangeType represents the type of change that occurred.
 */
export type QuadChangeType = "added" | "removed";

/**
 * QuadChangeEvent represents a change to a quad in the store.
 */
export interface QuadChangeEvent {
  /**
   * type indicates whether the quad was added or removed.
   */
  type: QuadChangeType;

  /**
   * quad is the quad that was added or removed.
   */
  quad: rdfjs.Quad;
}
