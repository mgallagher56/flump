import * as RadixPopover from "@radix-ui/react-popover";
import { X } from "lucide-react";
import { type FC, forwardRef, type ReactElement, type ReactNode, useId, useState } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import {
  popoverBodyRecipe,
  popoverCloseRecipe,
  popoverContentRecipe,
  popoverHeaderRecipe,
  popoverTitleRecipe,
} from "./Popover.styles";

/** Gap kept between the panel and the viewport edges, in px. */
const EDGE_PADDING = 16;

/** Marks a sticky header the panel must never sit under. `TopBar` sets it. */
export const STICKY_HEADER_ATTRIBUTE = "data-sticky-header";

/**
 * How far down the viewport a sticky header reaches, in px (0 when there is none). Measured, not a
 * token: the header grows with the notch inset and with large text (phone audit P32).
 */
export const stickyHeaderInset = (): number => {
  if (typeof document === "undefined") return 0;
  let bottom = 0;
  for (const header of document.querySelectorAll(`[${STICKY_HEADER_ATTRIBUTE}]`)) {
    const rect = header.getBoundingClientRect();
    // A header scrolled away or hidden (display: none) reaches nowhere.
    if (rect.height > 0 && rect.top <= 0) bottom = Math.max(bottom, rect.bottom);
  }
  return Math.max(0, bottom);
};

type PanelProps = Omit<RadixPopover.PopoverContentProps, "collisionPadding">;

/**
 * Radix mounts the content only while open, so the sticky header is measured each time the panel
 * opens. A top-side panel then flips below its trigger rather than sitting under the header.
 */
const PopoverPanel = forwardRef<HTMLDivElement, PanelProps>((props, ref) => {
  const [collisionPadding] = useState(() => ({
    top: stickyHeaderInset() + EDGE_PADDING,
    right: EDGE_PADDING,
    bottom: EDGE_PADDING,
    left: EDGE_PADDING,
  }));
  return <RadixPopover.Content ref={ref} collisionPadding={collisionPadding} {...props} />;
});
PopoverPanel.displayName = "PopoverPanel";

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
        <PopoverPanel
          side={side}
          align={align}
          sideOffset={8}
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
        </PopoverPanel>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};

export default Popover;
