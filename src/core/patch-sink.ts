import type { RDFPatch } from "./rdf-patch.ts";

/**
 * PatchSink is a sink that consumes RDF patches.
 *
 * Unlike a standard RDFJS Sink which only handles additions, a PatchSink
 * can handle both insertions and deletions via patches.
 *
 * This interface is useful for live synchronization where you need to
 * apply deltas from a remote source to a local store.
 */
export interface PatchSink {
  /**
   * applyPatches applies a stream of patches to the sink.
   *
   * This method accepts an async iterable of individual patches, allowing
   * the sink to batch them efficiently if needed.
   *
   * @param patches - Async iterable of patches to apply
   * @returns Promise that resolves when all patches have been fully applied
   */
  applyPatches(patches: AsyncIterable<RDFPatch>): Promise<void>;
}
