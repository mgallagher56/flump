import { usePrefersReducedMotion } from "@repo/ui";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * The home page's ambient motion (the orb at rest and the bubble fields) runs for longer than five
 * seconds, so the page gives a visible control to stop it (UX-GUIDELINES MK14, WCAG 2.2.2).
 *
 * - `running`: ambient motion may play. False when the visitor has paused it, and always false
 *   with reduced motion, where nothing ambient ever moves.
 * - `paused`: the visitor pressed the control.
 * - `available`: the control has something to stop (mounted in the browser, without reduced
 *   motion). The server render and a reduced-motion page have no moving parts, so no control.
 *
 * While paused, the document element carries `data-ambient="paused"`, which the bubble fields'
 * CSS reads (written out as `"html[data-ambient=paused] &"`, since Panda extracts styles
 * statically); scenes read `running` from `useAmbientMotion`.
 */
export interface AmbientMotionValue {
  readonly running: boolean;
  readonly paused: boolean;
  readonly available: boolean;
  readonly toggle: () => void;
}

const AmbientMotionContext = createContext<AmbientMotionValue>({
  running: false,
  paused: false,
  available: false,
  toggle: () => {},
});

export function useAmbientMotion(): AmbientMotionValue {
  return useContext(AmbientMotionContext);
}

export const AmbientMotionProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const root = document.documentElement;
    if (paused) root.dataset.ambient = "paused";
    else delete root.dataset.ambient;
    return () => {
      delete root.dataset.ambient;
    };
  }, [paused]);

  const toggle = useCallback(() => setPaused((was) => !was), []);
  const value = useMemo<AmbientMotionValue>(
    () => ({
      running: mounted && !reduced && !paused,
      paused,
      available: mounted && !reduced,
      toggle,
    }),
    [mounted, reduced, paused, toggle],
  );
  return <AmbientMotionContext.Provider value={value}>{children}</AmbientMotionContext.Provider>;
};
