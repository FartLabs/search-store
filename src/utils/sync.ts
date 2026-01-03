import type * as rdfjs from "@rdfjs/types";
import type { SearchStore } from "../search-store.ts";
import type { QuadFilter } from "../core/quad-source.ts";
import type { Subscription } from "../sync/subscription.ts";
import {
  PatchSource,
  type PatchStore,
} from "../sources/event-driven-patch-source.ts";
import { SearchPatchSink } from "../sinks/search-patch-sink.ts";
import { DefaultPatchSync, type PatchSyncOptions } from "../sync/patch-sync.ts";

/**
 * syncToSearchStore sets up patch-based synchronization from an RDF store to a
 * search store using typed callbacks.
 *
 * This is a convenience function that handles all the setup:
 * - Creates the patch sink
 * - Sets up direct callback-based synchronization (no async iterable conversion)
 *
 * @param rdfStore - The patch store (provides query and onPatch callback)
 * @param searchStore - The search store to sync to
 * @param filter - Optional filter for quads
 * @param options - Optional patch sync options (batching, etc.)
 * @returns A subscription that can be used to cancel synchronization
 *
 * @example
 * ```typescript
 * const rdfStore = new YourPatchStore();
 * const searchStore = new YourSearchStore();
 *
 * const subscription = syncToSearchStore(
 *   rdfStore,
 *   searchStore,
 *   { objectType: "string" },
 *   { batchSize: 10, batchTimeout: 1000 },
 * );
 *
 * // Later, to stop syncing:
 * await subscription.unsubscribe();
 * ```
 */
export function syncToSearchStore(
  rdfStore: PatchStore,
  searchStore: SearchStore,
  filter?: QuadFilter,
  options?: PatchSyncOptions,
): Subscription {
  const sink = new SearchPatchSink(searchStore);
  const sync = new DefaultPatchSync();

  return sync.subscribeToCallbacks(rdfStore, sink, filter, options);
}

/**
 * syncSnapshot performs a one-time synchronization from an RDF store to a
 * search store using patches.
 *
 * @param rdfStore - The RDF store (must support query)
 * @param searchStore - The search store to sync to
 * @param filter - Optional filter for quads
 *
 * @example
 * ```typescript
 * const rdfStore = new YourRDFStore();
 * const searchStore = new YourSearchStore();
 *
 * await syncSnapshot(rdfStore, searchStore, { objectType: "string" });
 * ```
 */
export async function syncSnapshot(
  rdfStore: { query(query: string, options?: unknown): unknown },
  searchStore: SearchStore,
  filter?: QuadFilter,
): Promise<void> {
  // Create a dummy patch callback source for snapshot-only sync
  const dummyCallbackSource = { onPatch: () => () => {} };
  const source = new PatchSource(
    rdfStore as { query(query: string, options?: unknown): rdfjs.Quad[] },
    dummyCallbackSource,
  );
  const sink = new SearchPatchSink(searchStore);
  const sync = new DefaultPatchSync();

  await sync.sync(source, sink, filter);
}
