import { useMatches } from "react-router";

/**
 * Route `handle` for a focused flow (UX N9): the page draws its own logo, steps and "Save and
 * exit", so the app shell leaves out the header navigation and the phone bottom bar.
 */
export const FOCUSED_SHELL_HANDLE = { focusedShell: true } as const;

/** True when any matched route asks for the focused shell. */
export function isFocusedShell(matches: ReadonlyArray<{ handle?: unknown }>): boolean {
  return matches.some(
    (match) =>
      typeof match.handle === "object" &&
      match.handle !== null &&
      (match.handle as { focusedShell?: unknown }).focusedShell === true,
  );
}

/** For the app shell (root.tsx): hide the header and bottom bar when this is true. */
export function useIsFocusedShell(): boolean {
  return isFocusedShell(useMatches());
}
