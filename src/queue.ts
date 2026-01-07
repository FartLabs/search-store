import type { Patch, PatchPuller, PatchPusher } from "./rdf-patch.ts";

/**
 * PatchQueue receives pushes and batches them into pulls.
 */
export class PatchQueue implements PatchPusher, PatchPuller {
  private queue: Patch[] = [];

  public push(...patches: Patch[]): void {
    this.queue.push(...patches);
  }

  public pull(): Patch[] {
    return this.queue.splice(0, this.queue.length);
  }
}
