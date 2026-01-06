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
 * PatchHandler handles patches.
 */
export interface PatchHandler {
  /**
   * patch handles a patch.
   */
  patch(patch: Patch): Promise<void>;
}

/**
 * PatchPusher pushes a series of patches.
 */
export interface PatchPusher {
  /**
   * push pushes a series of patches.
   */
  push(patches: Patch[]): Promise<void>;
}

/**
 * PatchPuller pulls a series of patches.
 */
export interface PatchPuller {
  /**
   * pull pulls a series of patches.
   */
  pull(): Promise<Patch[]>;
}
