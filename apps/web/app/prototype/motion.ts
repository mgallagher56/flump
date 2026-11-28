/*
 * PROTOTYPE ONLY (app design prototypes branch, never merged): the "Reduce motion" choice that
 * stops the level 2 breathing orbs. One home in this browser (`flump-proto-motion`), mirrored on
 * <html data-proto-motion="reduced"> for the CSS. In production this would be a profile setting
 * that also follows the device's reduced-motion preference.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "flump-proto-motion";
const EVENT = "flump-proto-motion";

export const readReducedMotion = (): boolean => {
  try {
    return window.localStorage.getItem(KEY) === "reduced";
  } catch {
    return false;
  }
};

export const applyReducedMotion = (reduced: boolean) => {
  const html = document.documentElement;
  if (reduced) html.dataset.protoMotion = "reduced";
  else delete html.dataset.protoMotion;
};

export const useProtoReducedMotion = () => {
  const [reduced, setReducedState] = useState(false);
  useEffect(() => {
    setReducedState(readReducedMotion());
    const onChange = () => setReducedState(readReducedMotion());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  const setReduced = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(KEY, next ? "reduced" : "full");
    } catch {
      // Private window: the choice still applies to this page.
    }
    applyReducedMotion(next);
    setReducedState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { reduced, setReduced };
};
