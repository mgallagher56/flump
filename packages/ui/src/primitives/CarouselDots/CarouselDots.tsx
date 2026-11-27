import type { FC } from "react";
import { cx } from "../../../styled-system/css";
import { LiveRegion } from "../LiveRegion";
import { VisuallyHidden } from "../VisuallyHidden";
import {
  carouselDotButtonRecipe,
  carouselDotRecipe,
  carouselDotsGroupRecipe,
  carouselDotsRecipe,
} from "./CarouselDots.styles";

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
    <div className={cx(carouselDotsRecipe(), className)} data-testid={id} id={id}>
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

export default CarouselDots;
