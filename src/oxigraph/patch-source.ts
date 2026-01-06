import type { Store } from "oxigraph";
import { PatchSourceImpl } from "#/rdf-patch/patch-source.ts";
import { proxy } from "#/rdf-patch/proxy.ts";
import { createOxigraphProxy } from "./proxy.ts";

/**
 * OxigraphPatchSource is a source that produces patches from an Oxigraph store.
 */
export class OxigraphPatchSource extends PatchSourceImpl {
  public readonly store: Store;
  /**
   * disconnect stops the proxy from forwarding patches.
   * Call this to clean up the connection when done.
   */
  public readonly disconnect: () => void;

  public constructor(store: Store) {
    super();
    const { sink, disconnect } = proxy(this);
    this.store = createOxigraphProxy(store, sink);
    this.disconnect = disconnect;
  }
}
