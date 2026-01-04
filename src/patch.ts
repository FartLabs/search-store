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
   * patch applies an AsyncIterable of patches to the sink.
   */
  patch(patches: AsyncIterable<Patch>): Promise<void>;
}

/**
 * PatchSource is a source that produces patches.
 */
export interface PatchSource {
  /**
   * pull returns the complete state of the source as an AsyncIterable of
   * insertion patches.
   */
  pull(): AsyncIterable<Patch>;

  /**
   * subscribe subscribes to a stream of patches.
   *
   * @returns A function to unsubscribe.
   */
  subscribe(fn: (patch: Patch) => void): () => void;
}

/**
 * PatchEmitter is an object that can emit patches sequentially.
 */
export interface PatchEmitter {
  /**
   * emit processes a patch and returns a promise that resolves when
   * the patch has been processed.
   */
  emit(patch: Patch): Promise<void>;
}
