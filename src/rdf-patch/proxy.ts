import type { Patch, PatchSink, PatchSource } from "./rdf-patch.ts";
import { PatchSourceImpl } from "./patch-source.ts";

/**
 * PatchQueueItem is an item in the patch queue.
 */
interface PatchQueueItem {
  patch: Patch;
  resolve: () => void;
}

/**
 * ProxyResult contains both the PatchSink for the store proxy and a cleanup function.
 */
export interface ProxyResult {
  /**
   * sink is the PatchSink that should be passed to the store proxy.
   */
  sink: PatchSink;
  /**
   * disconnect is a function to disconnect the proxy connection.
   */
  disconnect: () => void;
}

/**
 * proxy connects a PatchSource to a PatchSink by creating an intermediate sink
 * that receives patches from the store proxy and forwards them to the source's subscribers.
 *
 * @param source The PatchSource that manages subscribers
 * @param sink An optional downstream PatchSink to also receive patches
 * @returns A ProxyResult containing the sink for the store proxy and a cleanup function
 */
export function proxy(
  source: PatchSource,
  sink?: PatchSink,
): ProxyResult {
  let processing = Promise.resolve();
  const patchQueue: Array<PatchQueueItem> = [];
  let isDisconnected = false;

  const processQueue = (): void => {
    processing = processing.then(async () => {
      while (patchQueue.length > 0 && !isDisconnected) {
        const { patch, resolve } = patchQueue.shift()!;

        // Forward to source's subscribers
        if (source instanceof PatchSourceImpl) {
          await source.emit(patch);
        } else {
          // Fallback: subscribe to source and forward
          // This shouldn't happen if using PatchSourceImpl
          throw new Error("Source must be an instance of PatchSourceImpl");
        }

        // Also forward to downstream sink if provided
        if (sink && !isDisconnected) {
          await sink.patch(patch);
        }

        resolve();
      }

      // Check if new patches arrived while we were processing
      if (patchQueue.length > 0 && !isDisconnected) {
        processQueue();
      }
    });
  };

  // Create a sink that receives patches and forwards to source
  const forwardingSink: PatchSink = {
    patch(patch: Patch): Promise<void> {
      if (isDisconnected) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        patchQueue.push({ patch, resolve });
        processQueue();
      });
    },
  };

  const disconnect = (): void => {
    isDisconnected = true;
    patchQueue.length = 0;
  };

  return {
    sink: forwardingSink,
    disconnect,
  };
}
