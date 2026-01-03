import type { PatchSink } from "../core/patch-sink.ts";
import type { RDFPatch } from "../core/rdf-patch.ts";
import type { SearchStore } from "../search-store.ts";

/**
 * SearchPatchSink adapts SearchStore to PatchSink.
 *
 * This allows any SearchStore implementation to be used as a PatchSink,
 * enabling it to handle both insertions and deletions via patches.
 */
export class SearchPatchSink implements PatchSink {
  public constructor(private readonly searchStore: SearchStore) {}

  public async applyPatches(patches: AsyncIterable<RDFPatch>): Promise<void> {
    // Collect insertions and deletions
    const insertions: RDFPatch["quad"][] = [];
    const deletions: RDFPatch["quad"][] = [];

    for await (const patch of patches) {
      if (patch.action === "add") {
        insertions.push(patch.quad);
      } else if (patch.action === "remove") {
        deletions.push(patch.quad);
      }
    }

    // Apply deletions first, then insertions (to avoid conflicts)
    if (deletions.length > 0) {
      await this.searchStore.removeQuads(deletions);
    }

    if (insertions.length > 0) {
      await this.searchStore.addQuads(insertions);
    }
  }
}
