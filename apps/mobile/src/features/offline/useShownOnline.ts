/**
 * Whether this screen has shown online at least once (E12 S7 follow-up). A page opened offline says
 * it is offline; one already open when the connection drops stays, with what was typed, and its
 * Save waits for the connection. Latched for the screen's life.
 */
import { useRef } from "react";

export function useShownOnline(offline: boolean): boolean {
  const shown = useRef(false);
  if (!offline) shown.current = true;
  return shown.current;
}
