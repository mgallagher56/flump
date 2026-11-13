import * as RadixTooltip from "@radix-ui/react-tooltip";
import { createContext, type FC, type ReactElement, type ReactNode, useContext } from "react";
import { cx } from "../../../styled-system/css";
import { tooltipContentRecipe } from "./Tooltip.styles";

/** True below a `TooltipProvider`, so `Tooltip` only wraps itself when no provider is present. */
const HasProviderContext = createContext(false);

export interface TooltipProviderProps {
  children: ReactNode;
  /** Milliseconds before a tooltip opens on hover. */
  delayDuration?: number;
  /** Milliseconds a second tooltip opens without delay after one closed. */
  skipDelayDuration?: number;
}

/**
 * Optional app-level provider: share hover delays (and skip-delay between neighbouring tooltips)
 * across every `Tooltip` below it. Without one each `Tooltip` provides for itself.
 */
export const TooltipProvider: FC<TooltipProviderProps> = ({
  children,
  delayDuration = 300,
  skipDelayDuration,
}) => (
  <HasProviderContext.Provider value={true}>
    <RadixTooltip.Provider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
      {children}
    </RadixTooltip.Provider>
  </HasProviderContext.Provider>
);

export interface TooltipProps {
  /** Short text label (a few words). Never the only place information lives. */
  label: string;
  /** The element the tooltip describes. Rendered as-is (`asChild`), so pass a focusable element. */
  children: ReactElement;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Milliseconds before it opens on hover. Defaults to the provider's (300 without one). */
  delayDuration?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** data-testid for the content. */
  id?: string;
  className?: string;
}

/**
 * Hover and keyboard-focus label on Radix Tooltip: the trigger gets `aria-describedby`, Escape
 * dismisses, and content is portalled. It supplements an icon button that already has its own
 * `aria-label`; it does not replace one. It does not appear on touch, so never put information
 * only here (use `InfoTip`, which opens on tap, for glossary text).
 */
export const Tooltip: FC<TooltipProps> = ({
  label,
  children,
  side = "top",
  align = "center",
  delayDuration,
  open,
  defaultOpen,
  onOpenChange,
  id,
  className,
}) => {
  const hasProvider = useContext(HasProviderContext);
  const tooltip = (
    <RadixTooltip.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      delayDuration={delayDuration}
    >
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          {...(id ? { "data-testid": id } : {})}
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={16}
          className={cx(tooltipContentRecipe(), className)}
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
  return hasProvider ? (
    tooltip
  ) : (
    <RadixTooltip.Provider delayDuration={300}>{tooltip}</RadixTooltip.Provider>
  );
};

export default Tooltip;
