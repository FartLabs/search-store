import type * as rdfjs from "@rdfjs/types";
import type { Term } from "@rdfjs/types";
import type { QuadFilter, QuadSource } from "./quad-source.ts";
import type { RDFPatch } from "./rdf-patch.ts";

/**
 * PatchableStore is a unified interface for an RDF store that can both
 * provide data (like a Source) and accept patches (like a Sink that
 * understands removals).
 *
 * This addresses the "dual nature" problem: from the RDF perspective,
 * this is a source of data, but from the third-party storage perspective,
 * it's also a consumer of changes.
 *
 * The name "PatchableStore" makes it clear that this is a stateful store
 * that can handle both insertions and deletions via patches, avoiding the
 * directional confusion of "Source" vs "Sink".
 *
 * This interface aligns with RDFJS conventions while supporting live sync.
 */
export interface PatchableStore extends QuadSource {
  /**
   * match returns quads matching the given pattern.
   * This aligns with RDFJS Source.match() convention.
   *
   * @param subject - Optional subject term to match
   * @param predicate - Optional predicate term to match
   * @param object - Optional object term to match
   * @param graph - Optional graph term to match
   * @returns Async iterable of matching quads
   */
  match(
    subject?: Term,
    predicate?: Term,
    object?: Term,
    graph?: Term,
  ): AsyncIterable<rdfjs.Quad>;

  /**
   * applyPatches applies a stream of patches.
   *
   * This is the "sink-like" capability that understands removals, which
   * standard RDFJS Sinks don't support. By using patches, we can handle
   * both additions and deletions atomically.
   *
   * @param patches - Async iterable of patches to apply
   * @returns Promise that resolves when all patches have been fully applied
   */
  applyPatches(patches: AsyncIterable<RDFPatch>): Promise<void>;

  /**
   * snapshot is inherited from QuadSource and provides a filtered snapshot.
   * This is useful for initial synchronization.
   */
  snapshot(filter?: QuadFilter): AsyncIterable<rdfjs.Quad>;
}
