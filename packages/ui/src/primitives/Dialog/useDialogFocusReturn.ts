import { useEffect, useRef } from "react";

const FOCUSABLE = "button, a[href], input, select, textarea, summary, [tabindex]";
let lastPointerTarget: EventTarget | null = null;
let trackingPointer = false;

/**
 * Safari and Firefox on macOS do not focus a button on click, so the opener can be `body` when a
 * dialog opens. Track the last pointer target (registered lazily, once, to stay tree-shake safe)
 * so focus can still be returned to it.
 */
const trackPointerTarget = () => {
  if (trackingPointer || typeof document === "undefined") return;
  trackingPointer = true;
  const record = (event: Event) => {
    lastPointerTarget = event.target;
  };
  document.addEventListener("pointerdown", record, true);
  document.addEventListener("click", record, true);
};

const resolveOpener = (): HTMLElement | null => {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active !== document.body) return active;
  if (lastPointerTarget instanceof Element) {
    const el = lastPointerTarget.closest<HTMLElement>(FOCUSABLE);
    if (el?.isConnected) return el;
  }
  return null;
};

/** Opener is gone (for example it unmounted): land on the main landmark rather than `body`. */
const focusMainLandmark = () => {
  const main = document.querySelector<HTMLElement>("main");
  if (!main) return;
  const hadTabIndex = main.hasAttribute("tabindex");
  if (!hadTabIndex) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
  if (!hadTabIndex) main.removeAttribute("tabindex");
};

/**
 * Focus return for controlled (Trigger-less) Radix dialogs and sheets. Spread the two handlers
 * onto `RadixDialog.Content`. Shared by Dialog and Sheet so both keep the Safari/Firefox and
 * removed-opener fixes.
 */
export const useDialogFocusReturn = () => {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(trackPointerTarget, []);
  return {
    onOpenAutoFocus: () => {
      returnFocusRef.current = resolveOpener();
    },
    onCloseAutoFocus: (event: Event) => {
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      // Only restore when focus has nowhere better to be (body), so a late close can never
      // steal focus from something the user has already moved to.
      const active = document.activeElement;
      if (active && active !== document.body) return;
      event.preventDefault();
      if (target?.isConnected) target.focus();
      else if (target) focusMainLandmark();
    },
  };
};
