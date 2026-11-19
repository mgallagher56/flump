import * as RadixDialog from "@radix-ui/react-dialog";
import { type FC, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "../../primitives/Button";
import { useDialogFocusReturn } from "../../primitives/Dialog/useDialogFocusReturn";
import {
  confirmActions,
  confirmContent,
  confirmDescription,
  confirmError,
  confirmField,
  confirmInput,
  confirmOverlay,
  confirmTitle,
} from "./ConfirmDialog.styles";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` uses the destructive button; use it for anything that deletes or cannot be undone. */
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  /** Disables both buttons and blocks dismissal while the action runs. Sets `aria-busy`. */
  pending?: boolean;
  /** Optional confirm button copy while pending (for example "Deleting"). Defaults to `confirmLabel`. */
  pendingLabel?: string;
  /** Failure copy from the last confirm attempt. Shown inline (role="alert"); the dialog stays open. */
  error?: string | null;
  /** Optional control shown with the error, for example a "Sign in again" button. */
  errorAction?: ReactNode;
  /**
   * While pending, keep the confirm button focusable (`aria-disabled`, clicks ignored) instead
   * of disabled, so focus does not drop to the page when it was on that button.
   */
  keepFocusWhilePending?: boolean;
  /** When set, the confirm button stays disabled until the input matches (case-insensitive). */
  requireText?: string;
  /** Stable id for the dialog (also data-testid). Buttons get `${id}-cancel` and `${id}-confirm`. */
  id?: string;
  /**
   * What the action removes, stated by every caller (owner ruling 18 November 2026, UX D1).
   * - `"single"`: one item (a budget entry, a record, a debt, an account or pot). Focus starts on
   *   Confirm and Enter confirms, after a short arming delay.
   * - `"bulk"`: more than one thing or something wide-reaching (every record for a year, a bank
   *   connection, an import, an AI token, all data). Focus starts on Cancel and Enter confirms only
   *   when Confirm itself is focused.
   * A dialog with `requireText` behaves as `"bulk"`.
   */
  scope: "single" | "bulk";
}

/** After opening, Enter or Space on Confirm waits this long, so a quick double press on the
 * button that opened the dialog cannot also confirm it. */
export const CONFIRM_ARMING_DELAY_MS = 400;

/**
 * Modal confirmation for destructive actions. Built on Radix Dialog with role="alertdialog".
 *
 * Enter (owner ruling, 18 November 2026, UX D1), by `scope`:
 * - `"single"`: focus lands on Confirm, so the focus ring shows what Enter will do, and Enter
 *   confirms. Enter or Space on Confirm is ignored for `CONFIRM_ARMING_DELAY_MS` after opening.
 * - `"bulk"` (and any `requireText` dialog): focus lands on Cancel, and Enter confirms only when
 *   Confirm is focused (with `requireText`, also from the field), once the typed text matches.
 * Either way Enter acts once per opening; a held or repeating key never fires it, and a key still
 * held from the press that opened the dialog is ignored until released. Escape and Cancel cancel,
 * Enter on a focused Cancel cancels, and any other control in the dialog keeps its own Enter.
 * Focus returns to whatever opened it. Outside clicks never dismiss it.
 */
export const ConfirmDialog: FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  pending = false,
  pendingLabel,
  error,
  errorAction,
  keepFocusWhilePending = false,
  requireText,
  id = "confirm-dialog",
  scope,
}) => {
  const bulk = scope === "bulk" || requireText !== undefined;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusReturn = useDialogFocusReturn();
  const [typed, setTyped] = useState("");
  const inputId = useId();
  // Whether Enter is down anywhere on the page right now, so a press that opened the dialog is
  // not read as a confirmation.
  const enterHeld = useRef(false);
  // False from opening until an Enter that was already held has been released.
  const enterArmed = useRef(true);
  // True once Enter has confirmed for this opening (or this attempt, after an error).
  const enterFired = useRef(false);
  // When the dialog last opened, for the arming delay on a single-item confirm.
  const openedAt = useRef(0);
  const armingWait = () => !bulk && Date.now() - openedAt.current < CONFIRM_ARMING_DELAY_MS;
  // True while a Space press on Confirm that began inside the arming delay is still down, so
  // releasing it after the delay does not click Confirm either.
  const spaceBeganArming = useRef(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "Enter") enterHeld.current = true;
    };
    const up = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      enterHeld.current = false;
      enterArmed.current = true;
    };
    const reset = () => {
      enterHeld.current = false;
      enterArmed.current = true;
    };
    document.addEventListener("keydown", down, true);
    document.addEventListener("keyup", up, true);
    window.addEventListener("blur", reset);
    return () => {
      document.removeEventListener("keydown", down, true);
      document.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", reset);
    };
  }, []);

  // Parent-driven closes (e.g. after onConfirm resolves) keep this component mounted.
  useEffect(() => {
    if (!open) {
      setTyped("");
      return;
    }
    enterArmed.current = !enterHeld.current;
    enterFired.current = false;
    openedAt.current = Date.now();
  }, [open]);

  // A failed attempt can be tried again with Enter: once an attempt settles (pending ends, so a
  // second failure with the same text re-arms it too) or reports a new error.
  const wasPending = useRef(pending);
  useEffect(() => {
    if (wasPending.current && !pending) enterFired.current = false;
    wasPending.current = pending;
  }, [pending]);
  useEffect(() => {
    if (error) enterFired.current = false;
  }, [error]);

  const textMatches =
    requireText === undefined || typed.trim().toLowerCase() === requireText.trim().toLowerCase();

  const handleOpenChange = (next: boolean) => {
    if (pending && !next) return;
    onOpenChange(next);
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={handleOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={confirmOverlay()} />
        <RadixDialog.Content
          role="alertdialog"
          id={id}
          data-testid={id}
          className={confirmContent()}
          onOpenAutoFocus={(event) => {
            focusReturn.onOpenAutoFocus();
            event.preventDefault();
            // Focus without scrolling to the button: on a short phone screen the dialog scrolls,
            // and the reader must start at the title, not at the foot (phone audit P09).
            if (bulk) cancelRef.current?.focus({ preventScroll: true });
            else confirmRef.current?.focus({ preventScroll: true });
            const content = event.currentTarget as HTMLElement | null;
            if (content) content.scrollTop = 0;
          }}
          onCloseAutoFocus={focusReturn.onCloseAutoFocus}
          onKeyDown={(event) => {
            if (event.defaultPrevented) return;
            const target = event.target;
            const onConfirmButton = target === confirmRef.current;
            // Space on Confirm is the button's own click: hold it back while arming, and never
            // from a held key.
            if (event.key === " ") {
              if (!onConfirmButton) return;
              if (!event.repeat) spaceBeganArming.current = armingWait();
              if (event.repeat || armingWait()) event.preventDefault();
              return;
            }
            if (event.key !== "Enter") return;
            const onCancel = target === cancelRef.current;
            const onField = inputRef.current !== null && target === inputRef.current;
            const onDialog = target === event.currentTarget;
            // Any other control (a link in the description, "Sign in again") keeps its own Enter.
            if (!onCancel && !onConfirmButton && !onField && !onDialog) return;
            // These Enters are handled here, never by a button's own click, so a held or
            // repeating key cannot fire twice.
            event.preventDefault();
            if (event.repeat || !enterArmed.current || pending) return;
            if (onCancel) {
              handleOpenChange(false);
              return;
            }
            // A bulk dialog confirms only from Confirm itself (or the type-to-confirm field).
            if (bulk && onDialog) return;
            if (armingWait()) return;
            if (!textMatches || enterFired.current) return;
            enterFired.current = true;
            void onConfirm();
          }}
          onKeyUp={(event) => {
            // Some browsers click a button on Space's keyup: hold that back while arming too, and
            // for a press that began while arming, even when it is released after the delay.
            if (event.key !== " " || event.target !== confirmRef.current) return;
            const beganArming = spaceBeganArming.current;
            spaceBeganArming.current = false;
            if (beganArming || armingWait()) event.preventDefault();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <RadixDialog.Title className={confirmTitle()}>{title}</RadixDialog.Title>
          <RadixDialog.Description asChild>
            <div className={confirmDescription()}>{description}</div>
          </RadixDialog.Description>
          {error ? (
            <p role="alert" className={confirmError()}>
              {error}
            </p>
          ) : null}
          {error && errorAction ? errorAction : null}
          {requireText !== undefined ? (
            <label className={confirmField()} htmlFor={inputId}>
              <span>
                Type <strong>{requireText}</strong> to confirm
              </span>
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                autoComplete="off"
                className={confirmInput()}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                disabled={pending}
              />
            </label>
          ) : null}
          <div className={confirmActions()}>
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              id={`${id}-cancel`}
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef}
              type="button"
              id={`${id}-confirm`}
              variant={tone === "danger" ? "destructive" : "primary"}
              {...(keepFocusWhilePending
                ? { disabled: !pending && !textMatches, pending }
                : { disabled: pending || !textMatches, "aria-busy": pending || undefined })}
              onClick={() => {
                void onConfirm();
              }}
            >
              {pending && pendingLabel ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

export default ConfirmDialog;
