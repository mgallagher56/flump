import { createContext, useContext, useEffect, useState } from "react";

/**
 * Motion state for one prototype page. `reduced` is true when the system asks for reduced motion
 * or the dev panel's "Reduce motion" toggle is on. CSS also guards every animation with
 * `prefers-reduced-motion`, so the still page shows before any script runs.
 */
export interface MotionState {
  reduced: boolean;
  osReduced: boolean;
  forced: boolean;
  setForced: (value: boolean) => void;
}

export const MotionContext = createContext<MotionState>({
  reduced: false,
  osReduced: false,
  forced: false,
  setForced: () => {},
});

export const useMotion = () => useContext(MotionContext);

export function useMotionState(): MotionState {
  const [osReduced, setOsReduced] = useState(false);
  const [forced, setForced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setOsReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return { reduced: osReduced || forced, osReduced, forced, setForced };
}

/** Calls `onChange` when the site theme flips (the theme script sets `data-theme` on <html>). */
export function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const bump = () => setVersion((v) => v + 1);
    query.addEventListener("change", bump);
    return () => {
      observer.disconnect();
      query.removeEventListener("change", bump);
    };
  }, []);
  return version;
}
