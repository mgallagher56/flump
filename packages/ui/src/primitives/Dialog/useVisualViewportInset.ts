import { useEffect } from "react";

/** Height of the part of the page a person can see, in px: the viewport above the keyboard. */
export const VISUAL_VIEWPORT_HEIGHT_VAR = "--visual-viewport-height";
/** How much of the layout viewport the on-screen keyboard covers at the bottom, in px. */
export const KEYBOARD_INSET_VAR = "--keyboard-inset";

let openModals = 0;
let stop: (() => void) | null = null;

/**
 * The keyboard's share of the screen, from the visual viewport. On a phone the on-screen keyboard
 * shrinks the visual viewport but not the layout viewport, so a `position: fixed` sheet anchored at
 * `bottom: 0` sits under the keyboard and the browser pans the whole page to show each field it
 * focuses: the sheet jumped up and down between fields. Exported for the tests.
 */
export function measureKeyboard(
  layoutHeight: number,
  viewport: { height: number; offsetTop: number; scale?: number },
): { height: number; inset: number } {
  // Pinch zoom shrinks the visual viewport too; that is not a keyboard, so keep the full height.
  if ((viewport.scale ?? 1) > 1) return { height: Math.round(layoutHeight), inset: 0 };
  const inset = Math.max(0, Math.round(layoutHeight - viewport.height - viewport.offsetTop));
  return { height: Math.round(viewport.height), inset };
}

/**
 * The layout viewport height that `position: fixed; bottom: 0` is measured against. On iOS Safari
 * `documentElement.clientHeight` is the small viewport (toolbars shown), which is short by the
 * toolbar height once they collapse; `innerHeight` follows the toolbars but not the keyboard.
 */
function layoutViewportHeight(): number {
  return window.innerHeight || document.documentElement.clientHeight;
}

function start(): () => void {
  const viewport = window.visualViewport;
  if (!viewport) return () => {};
  const root = document.documentElement;
  let frame = 0;
  let last = "";
  const write = () => {
    frame = 0;
    const { height, inset } = measureKeyboard(layoutViewportHeight(), viewport);
    // Scroll events fire every frame while the page pans: only touch the style when it changes.
    const next = `${height}:${inset}`;
    if (next === last) return;
    last = next;
    root.style.setProperty(VISUAL_VIEWPORT_HEIGHT_VAR, `${height}px`);
    root.style.setProperty(KEYBOARD_INSET_VAR, `${inset}px`);
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(write);
  };
  write();
  viewport.addEventListener("resize", schedule);
  viewport.addEventListener("scroll", schedule);
  return () => {
    window.cancelAnimationFrame(frame);
    viewport.removeEventListener("resize", schedule);
    viewport.removeEventListener("scroll", schedule);
    root.style.removeProperty(VISUAL_VIEWPORT_HEIGHT_VAR);
    root.style.removeProperty(KEYBOARD_INSET_VAR);
  };
}

/**
 * While a modal is open, publish the visible height and the keyboard inset as CSS variables on
 * `<html>`, so `Dialog` and `Sheet` sit on top of the keyboard and keep their own scroll area inside
 * what can be seen. Focusing the next field then scrolls the sheet's body, not the page, so the sheet
 * moves once when the keyboard opens and stays put after that. Shared by every open modal; the
 * variables are removed when the last one closes, and the styles fall back to the full viewport.
 */
export function useVisualViewportInset(active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    openModals += 1;
    if (openModals === 1) stop = start();
    return () => {
      openModals -= 1;
      if (openModals === 0) {
        stop?.();
        stop = null;
      }
    };
  }, [active]);
}
