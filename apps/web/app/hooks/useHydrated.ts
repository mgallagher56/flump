import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False in the server HTML and during hydration, true once React runs in the browser. Controls that
 * need script (menus, toggles) use it to stay visibly inert until a click can do something.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export default useHydrated;
