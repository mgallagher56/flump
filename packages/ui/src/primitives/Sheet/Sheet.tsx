import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { useDialogFocusReturn } from "../Dialog/useDialogFocusReturn";
import { Icon } from "../Icon";
import { visuallyHiddenRecipe } from "../VisuallyHidden/VisuallyHidden.styles";
import {
  sheetBodyRecipe,
  sheetCloseRecipe,
  sheetContentRecipe,
  sheetDescriptionRecipe,
  sheetFooterRecipe,
  sheetHandleRecipe,
  sheetHeaderRecipe,
  sheetOverlayRecipe,
  sheetTitleRecipe,
} from "./Sheet.styles";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required: every sheet is named (J-04). Plain sentence case. */
  title: string;
  /** Keep the title for assistive tech but do not draw it. */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  /** Action row, primary last. Stacked full width on a phone. */
  footer?: ReactNode;
  /**
   * `bottom` (default): a bottom sheet at every width (centred from `md`).
   * `right`: a bottom sheet under `md`, a side sheet from `md` up.
   */
  side?: "bottom" | "right";
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Stable id for the sheet content (also set as data-testid). */
  id?: string;
  className?: string;
}

/**
 * Sheet on Radix Dialog (role="dialog", aria-modal, labelled by its title, Escape and scrim
 * dismiss, focus trapped and restored). Slides up from the bottom under `md` with a grab handle,
 * safe-area inset padding and an internally scrolling body. Shape-compatible with
 * SimulatorSplitLayout's `renderControlsContainer({ open, onOpenChange, id, label, children })`:
 * `<Sheet open onOpenChange id title={label}>{children}</Sheet>`.
 */
export const Sheet: FC<SheetProps> = ({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  description,
  children,
  footer,
  side = "bottom",
  closeLabel = "Close",
  id,
  className,
}) => {
  const focusReturn = useDialogFocusReturn();
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={sheetOverlayRecipe()} />
        <RadixDialog.Content
          id={id}
          data-testid={id}
          aria-modal="true"
          {...focusReturn}
          {...(description ? {} : { "aria-describedby": undefined })}
          className={cx(sheetContentRecipe({ side }), className)}
        >
          <div aria-hidden="true" className={sheetHandleRecipe({ side })} />
          <div className={sheetHeaderRecipe()}>
            <div>
              <RadixDialog.Title
                className={hideTitle ? visuallyHiddenRecipe() : sheetTitleRecipe()}
              >
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className={sheetDescriptionRecipe()}>
                  {description}
                </RadixDialog.Description>
              ) : null}
            </div>
            <RadixDialog.Close asChild>
              <button type="button" aria-label={closeLabel} className={sheetCloseRecipe()}>
                <Icon icon={X} size="sm" />
              </button>
            </RadixDialog.Close>
          </div>
          <div className={sheetBodyRecipe()}>{children}</div>
          {footer ? <div className={sheetFooterRecipe()}>{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

export default Sheet;
