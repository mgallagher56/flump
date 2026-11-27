import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, FC, MouseEvent } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import { LiveRegion } from "../LiveRegion";
import { VisuallyHidden } from "../VisuallyHidden";
import {
  carouselDotButtonRecipe,
  carouselDotRecipe,
  carouselDotsGroupRecipe,
  carouselDotsRecipe,
  carouselStepButtonRecipe,
} from "./CarouselDots.styles";

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

export interface CarouselDotsProps {
  /**
   * One name per item, in order ("Accounts", "Budget"). The number of dots is its length and each
   * dot is named by its item, so no count text is ever needed (UX-GUIDELINES MK9).
   */
  itemLabels: string[];
  /** Index of the item on show. */
  current: number;
  /** Called with the index of the dot that was chosen. */
  onSelect: (index: number) => void;
  /** The group's accessible name, for example "Features". */
  label: string;
  /** The id of the region the dots control (`aria-controls` on every dot). */
  controls?: string;
  id?: string;
  className?: string;
}

/**
 * Dots for sideways content: one real button per item in a labelled group. The current dot has
 * `aria-current="true"` and is a longer filled pill. Every dot is in the Tab order in DOM order
 * (no roving tabindex, kept simple on purpose); Enter and Space choose it. A change of item is
 * announced politely ("Showing Budget"), never on first render.
 */
export const CarouselDots: FC<CarouselDotsProps> = ({
  itemLabels,
  current,
  onSelect,
  label,
  controls,
  id,
  className,
}) => {
  const currentLabel = itemLabels[current] ?? "";
  return (
    <div className={cx(carouselDotsRecipe(), className)} id={id}>
      {/* biome-ignore lint/a11y/useSemanticElements: a labelled set of buttons, not a form fieldset. */}
      <div role="group" aria-label={label} className={carouselDotsGroupRecipe()}>
        {itemLabels.map((itemLabel, index) => {
          const isCurrent = index === current;
          return (
            <button
              // Item names are unique within one carousel; the index keeps duplicates safe.
              key={`${index}-${itemLabel}`}
              type="button"
              className={carouselDotButtonRecipe()}
              aria-current={isCurrent ? "true" : undefined}
              aria-controls={controls}
              onClick={() => onSelect(index)}
            >
              <span aria-hidden="true" className={carouselDotRecipe({ current: isCurrent })} />
              <VisuallyHidden>{itemLabel}</VisuallyHidden>
            </button>
          );
        })}
      </div>
      <LiveRegion message={currentLabel ? `Showing ${currentLabel}` : ""} visuallyHidden />
    </div>
  );
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

export default CarouselDots;
