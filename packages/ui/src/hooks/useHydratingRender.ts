import { useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * True when this component's first render hydrated server HTML, false when it mounted on the
 * client (a client navigation, or a client-only root). React reads `getServerSnapshot` on the
 * server and while hydrating, and `getSnapshot` on a client render, so the first value tells the
 * two apart. The answer is fixed for the life of the component.
 *
 * Motion that plays "once on first view" uses it to skip the replay on server-rendered pages: the
 * final state is already painted from the server HTML, so animating after hydration would flash.
 */
export function useHydratingRender(): boolean {
  const onClient = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const [hydrating] = useState(() => !onClient);
  return hydrating;
}
