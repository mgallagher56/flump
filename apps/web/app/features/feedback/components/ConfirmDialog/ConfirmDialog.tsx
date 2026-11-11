import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@repo/ui";
import { type FC, type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  confirmActions,
  confirmContent,
  confirmDescription,
  confirmField,
  confirmInput,
  confirmOverlay,
  confirmTitle,
} from "./ConfirmDialog.styles";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  onConfirm: () => void | Promise<void>;
  pending?: boolean;
  /** When set, the confirm button stays disabled until the input matches (case-insensitive). */
  requireText?: string;
}

/**
 * Modal confirmation for destructive actions. Built on Radix Dialog with
 * role="alertdialog" (no @radix-ui/react-alert-dialog dependency in apps/web).
 * Initial focus lands on Cancel so Enter never confirms by accident.
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
  requireText,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
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
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={confirmOverlay()} />
        <Dialog.Content
          role="alertdialog"
          id="confirm-dialog"
          className={confirmContent()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
            cancelRef.current?.focus();
          }}
          // No Dialog.Trigger here, so Radix would drop focus on <body>; hand it back to
          // whatever opened the dialog (e.g. the Delete button inside a parent modal).
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className={confirmTitle()}>{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div className={confirmDescription()}>{description}</div>
          </Dialog.Description>
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
              id="confirm-dialog-cancel"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              id="confirm-dialog-confirm"
              variant={tone === "danger" ? "destructive" : "primary"}
              disabled={pending || !textMatches}
              onClick={() => {
                void onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
