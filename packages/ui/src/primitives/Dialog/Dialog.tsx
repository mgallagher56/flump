import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import {
  dialogCloseRecipe,
  dialogContentRecipe,
  dialogDescriptionRecipe,
  dialogHeaderRecipe,
  dialogOverlayRecipe,
  dialogTitleRecipe,
} from "./Dialog.styles";

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

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Stable id for the dialog content (also set as data-testid). */
  id?: string;
  className?: string;
}

/**
 * Modal dialog on Radix: role="dialog", aria-modal, labelled by its title, Escape and
 * overlay click dismiss, focus trapped while open and restored to the trigger on close.
 * Rendered in a portal so ancestor transforms cannot trap `position: fixed`.
 */
export const Dialog: FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  closeLabel = "Close",
  id,
  className,
}) => {
  // Controlled dialogs have no Radix Trigger, so remember what had focus and restore it on close.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(trackPointerTarget, []);
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={dialogOverlayRecipe()}>
          <RadixDialog.Content
            id={id}
            data-testid={id}
            aria-modal="true"
            onOpenAutoFocus={() => {
              returnFocusRef.current = resolveOpener();
            }}
            onCloseAutoFocus={(event) => {
              const target = returnFocusRef.current;
              returnFocusRef.current = null;
              // Only restore when focus has nowhere better to be (body), so a late close can never
              // steal focus from something the user has already moved to.
              const active = document.activeElement;
              if (active && active !== document.body) return;
              event.preventDefault();
              if (target?.isConnected) target.focus();
              else if (target) focusMainLandmark();
            }}
            {...(description ? {} : { "aria-describedby": undefined })}
            className={cx(dialogContentRecipe({ size }), className)}
          >
            <div className={dialogHeaderRecipe()}>
              <div>
                <RadixDialog.Title className={dialogTitleRecipe()}>{title}</RadixDialog.Title>
                {description ? (
                  <RadixDialog.Description className={dialogDescriptionRecipe()}>
                    {description}
                  </RadixDialog.Description>
                ) : null}
              </div>
              <RadixDialog.Close asChild>
                <button type="button" aria-label={closeLabel} className={dialogCloseRecipe()}>
                  <Icon icon={X} size="sm" />
                </button>
              </RadixDialog.Close>
            </div>
            {children}
          </RadixDialog.Content>
        </RadixDialog.Overlay>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

export default Dialog;
