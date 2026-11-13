import * as RadixPopover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { type FC, type ReactElement, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import {
  popoverBodyRecipe,
  popoverCloseRecipe,
  popoverContentRecipe,
  popoverHeaderRecipe,
  popoverTitleRecipe,
} from "./Popover.styles";

export interface PopoverProps {
  /** The element that opens the popover. Rendered as-is (`asChild`), so pass a button. */
  trigger: ReactElement;
  /** Heading shown at the top and used as the dialog's accessible name. */
  title?: string;
  /** Accessible name when there is no visible `title`. */
  "aria-label"?: string;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  size?: "sm" | "md";
  /** Show the close button. Defaults to true. */
  showClose?: boolean;
  /** Accessible name for the close button. */
  closeLabel?: string;
  /** Heading element for the title. Defaults to `h2`; use `div` where a heading would break the outline. */
  titleAs?: "h2" | "h3" | "h4" | "div";
  /**
   * Id for the body element (also data-testid). Radix keeps its own id on the content so the
   * trigger's `aria-controls` stays valid.
   */
  id?: string;
  className?: string;
}

/**
 * Anchored, non-modal panel on Radix Popover: role="dialog", focus moves into the panel on open,
 * Escape or outside click dismiss, and focus returns to the trigger on close. Rendered in a portal
 * so ancestor transforms and overflow cannot clip it.
 */
export const Popover: FC<PopoverProps> = ({
  trigger,
  title,
  "aria-label": ariaLabel,
  children,
  open,
  defaultOpen,
  onOpenChange,
  side = "bottom",
  align = "start",
  size = "md",
  showClose = true,
  closeLabel = "Close",
  titleAs: TitleTag = "h2",
  id,
  className,
}) => {
  const titleId = useId();
  return (
    <RadixPopover.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={16}
          aria-labelledby={title ? titleId : undefined}
          aria-label={title ? undefined : ariaLabel}
          className={cx(popoverContentRecipe({ size }), className)}
        >
          {title || showClose ? (
            <div className={popoverHeaderRecipe()}>
              {title ? (
                <TitleTag id={titleId} className={popoverTitleRecipe()}>
                  {title}
                </TitleTag>
              ) : (
                <span />
              )}
              {showClose ? (
                <RadixPopover.Close asChild>
                  <button type="button" aria-label={closeLabel} className={popoverCloseRecipe()}>
                    <Icon icon={X} size="sm" />
                  </button>
                </RadixPopover.Close>
              ) : null}
            </div>
          ) : null}
          <div {...(id ? { id, "data-testid": id } : {})} className={popoverBodyRecipe()}>
            {children}
          </div>
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};

export default Popover;
