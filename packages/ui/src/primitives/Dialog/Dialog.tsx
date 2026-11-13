import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { visuallyHiddenRecipe } from "../VisuallyHidden/VisuallyHidden.styles";
import {
  dialogCloseRecipe,
  dialogContentRecipe,
  dialogDescriptionRecipe,
  dialogFooterRecipe,
  dialogHeaderRecipe,
  dialogOverlayRecipe,
  dialogTitleRecipe,
} from "./Dialog.styles";
import { useDialogFocusReturn } from "./useDialogFocusReturn";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required: every dialog is named (J-04). Plain sentence case. */
  title: string;
  /** Keep the title for assistive tech but do not draw it. Use sparingly. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  /**
   * Action row, primary action last. Right-aligned from `sm` up; stacked full width on a phone
   * with the primary action on top.
   */
  footer?: ReactNode;
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
  hideTitle = false,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Close",
  id,
  className,
}) => {
  // Controlled dialogs have no Radix Trigger, so remember what had focus and restore it on close.
  const focusReturn = useDialogFocusReturn();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={dialogOverlayRecipe()}>
          <RadixDialog.Content
            id={id}
            data-testid={id}
            aria-modal="true"
            {...focusReturn}
            {...(description ? {} : { "aria-describedby": undefined })}
            className={cx(dialogContentRecipe({ size }), className)}
          >
            <div className={dialogHeaderRecipe()}>
              <div>
                <RadixDialog.Title
                  className={hideTitle ? visuallyHiddenRecipe() : dialogTitleRecipe()}
                >
                  {title}
                </RadixDialog.Title>
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
            {footer ? <div className={dialogFooterRecipe()}>{footer}</div> : null}
          </RadixDialog.Content>
        </RadixDialog.Overlay>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

export default Dialog;
