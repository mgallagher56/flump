import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` in the browser, `useEffect` on the server (where layout effects warn and never
 * run). Motion hooks use it to move into their start state before the first paint, so a scene or
 * ring is never drawn at its end state and then replayed from the start.
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
