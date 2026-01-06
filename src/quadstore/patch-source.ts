import type { Quadstore } from "quadstore";
import { PatchSourceImpl } from "#/rdf-patch/patch-source.ts";
import { proxy } from "#/rdf-patch/proxy.ts";
import { createQuadstoreProxy } from "./proxy.ts";

/**
 * QuadstorePatchSource is a source that produces patches from a Quadstore store.
 */
export class QuadstorePatchSource extends PatchSourceImpl {
  public readonly store: Quadstore;
  /**
   * disconnect stops the proxy from forwarding patches.
   * Call this to clean up the connection when done.
   */
  public readonly disconnect: () => void;

  public constructor(store: Quadstore) {
    super();
    const { sink, disconnect } = proxy(this);
    this.store = createQuadstoreProxy(store, sink);
    this.disconnect = disconnect;
  }
}
