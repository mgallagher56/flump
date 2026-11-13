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
  /** When set, the confirm button stays disabled until the input matches (case-insensitive). */
  requireText?: string;
  /** Stable id for the dialog (also data-testid). Buttons get `${id}-cancel` and `${id}-confirm`. */
  id?: string;
}

/**
 * Modal confirmation for destructive actions. Built on Radix Dialog with
 * role="alertdialog". Initial focus lands on Cancel so Enter never confirms by accident, and
 * focus returns to whatever opened it. Outside clicks never dismiss it.
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
  requireText,
  id = "confirm-dialog",
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const focusReturn = useDialogFocusReturn();
  const [typed, setTyped] = useState("");
  const inputId = useId();

  // Parent-driven closes (e.g. after onConfirm resolves) keep this component mounted.
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

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
            cancelRef.current?.focus();
          }}
          onCloseAutoFocus={focusReturn.onCloseAutoFocus}
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
              type="button"
              id={`${id}-confirm`}
              variant={tone === "danger" ? "destructive" : "primary"}
              disabled={pending || !textMatches}
              aria-busy={pending || undefined}
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
