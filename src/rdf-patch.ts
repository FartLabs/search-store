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
 * PatchProxy proxies a target object with a patch pusher.
 */
export interface PatchProxy<T> {
  proxy(target: T, pusher: PatchPusher): T;
}

/**
 * PatchPusher pushes a series of patches.
 */
export interface PatchPusher {
  /**
   * push pushes a series of patches.
   */
  push(...patches: Patch[]): void;
}

/**
 * PatchPuller pulls a series of patches.
 */
export interface PatchPuller {
  /**
   * pull pulls a series of patches.
   */
  pull(): Patch[];
}
