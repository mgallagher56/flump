import type { FC, HTMLAttributes } from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../VisuallyHidden";
import { spinnerRecipe, spinnerRoot } from "./Spinner.styles";

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
  /** `inherit` uses the current text colour. */
  tone?: "primary" | "inherit";
  /** Screen reader text. Defaults to "Loading". */
  label?: string;
  /**
   * Default true: `role="status"` with the label for screen readers. Pass false when a parent
   * already announces the loading state; the spinner is then `aria-hidden` with no role or label.
   */
  announce?: boolean;
}

export const Spinner: FC<SpinnerProps> = ({
  size = "md",
  tone = "primary",
  label = "Loading",
  announce = true,
  className,
  ...props
}) =>
  announce ? (
    <span role="status" className={cx(spinnerRoot(), className)} {...props}>
      <span aria-hidden="true" className={spinnerRecipe({ size, tone })} />
      <VisuallyHidden>{label}</VisuallyHidden>
    </span>
  ) : (
    <span aria-hidden="true" className={cx(spinnerRoot(), className)} {...props}>
      <span className={spinnerRecipe({ size, tone })} />
    </span>
  );

export default Spinner;
