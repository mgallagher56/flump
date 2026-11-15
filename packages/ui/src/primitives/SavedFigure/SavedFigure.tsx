import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { useSavedFigureChange } from "../../hooks/useSavedFigureChange";
import {
  savedFigureLabelRecipe,
  savedFigureRecipe,
  savedFigureValueRecipe,
} from "./SavedFigure.styles";

export interface SavedFigureProps<T = number | string | null | undefined> {
  /** The saved value to display. When this updates, the cross-fade and wash trigger. */
  value: T;
  /** Label for the figure (e.g. account name or category). */
  label?: ReactNode;
  /** Optional formatter for the value. Defaults to string conversion. */
  format?: (val: T) => ReactNode;
  /** Custom renderer for children or value display. */
  children?: ReactNode | ((val: T) => ReactNode);
  /** Optional element id, paired with data-testid. */
  id?: string;
  className?: string;
}

/**
 * E17 Demo 1: Saved figure change.
 * Renders a card or figure row that plays once when a balance or budget figure is saved:
 * - Cross-fades the figure over `durations.fast` (120ms).
 * - Plays a pale teal wash over `durations.scene` (900ms).
 * - Under `prefers-reduced-motion`: swaps immediately with no animation.
 * - Never plays on initial mount or ordinary re-renders.
 */
export const SavedFigure: FC<SavedFigureProps> = ({
  value,
  label,
  format,
  children,
  id = "saved-figure",
  className,
}) => {
  const { displayedValue, isOut, isWashed } = useSavedFigureChange(value);

  const formattedValue =
    typeof children === "function"
      ? children(displayedValue)
      : format
        ? format(displayedValue)
        : children !== undefined
          ? children
          : String(displayedValue ?? "");

  return (
    <div
      className={cx(savedFigureRecipe(), className)}
      data-testid={id}
      data-wash={isWashed ? "true" : "false"}
      id={id}
    >
      {label ? (
        <span className={savedFigureLabelRecipe()} data-testid={`${id}-label`}>
          {label}
        </span>
      ) : null}
      <b
        className={savedFigureValueRecipe()}
        data-out={isOut ? "true" : "false"}
        data-testid={`${id}-value`}
      >
        {formattedValue}
      </b>
    </div>
  );
};

export default SavedFigure;
