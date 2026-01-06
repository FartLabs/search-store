import { Store } from "n3";
import { PatchSourceImpl } from "#/rdf-patch/patch-source.ts";
import { proxy } from "#/rdf-patch/proxy.ts";
import { createN3Proxy } from "./proxy.ts";

/**
 * N3PatchSource is a source that produces patches from an N3 store.
 */
export class N3PatchSource extends PatchSourceImpl {
  public readonly store: Store;
  /**
   * disconnect stops the proxy from forwarding patches.
   * Call this to clean up the connection when done.
   */
  public readonly disconnect: () => void;

  public constructor(store: Store) {
    super();
    const { sink, disconnect } = proxy(this);
    this.store = createN3Proxy(store, sink);
    this.disconnect = disconnect;
  }
}
