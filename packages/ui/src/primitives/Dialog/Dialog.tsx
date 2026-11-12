import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { FC, ReactNode } from "react";
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
}) => (
  <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={dialogOverlayRecipe()}>
        <RadixDialog.Content
          id={id}
          data-testid={id}
          aria-modal="true"
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

export default Dialog;
