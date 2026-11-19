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
}

/**
 * Modal confirmation for destructive actions. Built on Radix Dialog with role="alertdialog".
 *
 * Enter confirms (owner ruling, 18 November 2026, UX D1): initial focus lands on the confirm
 * button so the focus ring shows what Enter will do. It stays safe by design: Enter acts once per
 * opening, a held or repeating key never fires it, and a key still held from the press that
 * opened the dialog is ignored until it has been released. Escape and Cancel cancel, and Enter on
 * a focused Cancel cancels. With `requireText`, focus starts on Cancel and Enter confirms only
 * from the field once the typed text matches. Focus returns to whatever opened it. Outside clicks
 * never dismiss it.
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
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
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
  }, [open]);

  // A failed attempt can be tried again with Enter.
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
            if (requireText === undefined) confirmRef.current?.focus();
            else cancelRef.current?.focus();
          }}
          onCloseAutoFocus={focusReturn.onCloseAutoFocus}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.defaultPrevented) return;
            const target = event.target as HTMLElement | null;
            // Every Enter is handled here, never by a button's own click, so a held or repeating
            // key cannot fire twice.
            event.preventDefault();
            if (event.repeat || !enterArmed.current || pending) return;
            if (target === cancelRef.current) {
              handleOpenChange(false);
              return;
            }
            if (requireText !== undefined && target?.tagName !== "INPUT") return;
            if (!textMatches || enterFired.current) return;
            enterFired.current = true;
            void onConfirm();
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
