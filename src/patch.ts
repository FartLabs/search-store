import type * as rdfjs from "@rdfjs/types";

/**
 * Patch is a batch of RDF/JS store changes.
 *
 * @see https://www.w3.org/DesignIssues/Diff.html
 */
export interface Patch {
  /**
   * insertions are the quads that were added.
   */
  insertions: rdfjs.Quad[];

  /**
   * deletions are the quads that were removed.
   */
  deletions: rdfjs.Quad[];
}

/**
 * PatchSink is a sink that consumes patches.
 */
export interface PatchSink {
  /**
   * patch applies a patch to the sink.
   */
  patch(patch: Patch): Promise<void>;
}

/**
 * QuadSource is a source that can provide quads.
 */
export interface QuadSource {
  /**
   * getQuads returns the complete state of the source as an AsyncIterable of quads.
   */
  getQuads(): AsyncIterable<rdfjs.Quad>;
}

/**
 * PatchSource is a source that produces patches.
 */
export interface PatchSource {
  /**
   * subscribe subscribes to a stream of patches.
   *
   * @returns A function to unsubscribe.
   */
  subscribe(fn: (patch: Patch) => void): () => void;
}
