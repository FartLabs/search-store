import { Store } from "n3";
import type { Patch } from "../patch.ts";

/**
 * n3Proxy wraps a Store with a proxy that listens to changes and
 * emits patches.
 */
export function n3Proxy(
  store: Store,
  _subscribers: Set<(patch: Patch) => void>,
): Store {
  return new Proxy(store, {
    get(target, prop, _receiver) {
      // TODO: call subscribers with a patch if the prop is a method that changes the store.
      return target[prop as keyof typeof target];
    },
  });
}
