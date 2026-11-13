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
}

export const Spinner: FC<SpinnerProps> = ({
  size = "md",
  tone = "primary",
  label = "Loading",
  className,
  ...props
}) => (
  <span role="status" className={cx(spinnerRoot(), className)} {...props}>
    <span aria-hidden="true" className={spinnerRecipe({ size, tone })} />
    <VisuallyHidden>{label}</VisuallyHidden>
  </span>
);

export default Spinner;
