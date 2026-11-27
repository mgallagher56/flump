import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, FC, MouseEvent } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { VisuallyHidden } from "../VisuallyHidden";
import { carouselStepButtonRecipe } from "./CarouselStepButton.styles";

export type CarouselDirection = "previous" | "next";

/**
 * The index a previous or next step moves to, or `null` at an end when `loop` is off. Callers use
 * it to wire `CarouselStepButton`: `null` means the button is disabled.
 */
export const getCarouselStep = (
  current: number,
  count: number,
  direction: CarouselDirection,
  loop = false,
): number | null => {
  if (count <= 0) return null;
  const target = direction === "next" ? current + 1 : current - 1;
  if (target >= 0 && target < count) return target;
  if (!loop || count === 1) return null;
  return direction === "next" ? 0 : count - 1;
};

export interface CarouselStepButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "disabled"> {
  direction: CarouselDirection;
  /** The name of the item this step shows, added to the label ("Previous: Budget"). */
  targetLabel?: string;
  /**
   * At an end without `loop`. The button stays focusable (`aria-disabled`) so the Tab order does
   * not change under the keyboard, and a click does nothing.
   */
  disabled?: boolean;
  /** The id of the region the button controls. */
  controls?: string;
}

const directionText: Record<CarouselDirection, string> = {
  previous: "Previous",
  next: "Next",
};

/** A real previous or next button with a chevron and a spoken label. */
export const CarouselStepButton: FC<CarouselStepButtonProps> = ({
  direction,
  targetLabel,
  disabled = false,
  controls,
  className,
  id,
  onClick,
  ...props
}) => {
  const text = directionText[direction];
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };
  return (
    <button
      {...props}
      data-testid={id}
      id={id}
      type="button"
      className={cx(carouselStepButtonRecipe(), className)}
      aria-disabled={disabled ? "true" : undefined}
      aria-controls={controls}
      onClick={handleClick}
    >
      <Icon icon={direction === "next" ? ChevronRight : ChevronLeft} size="md" />
      <VisuallyHidden>{targetLabel && !disabled ? `${text}: ${targetLabel}` : text}</VisuallyHidden>
    </button>
  );
};

export default CarouselStepButton;
