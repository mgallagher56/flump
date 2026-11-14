import type { ComponentPropsWithRef, FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { textInputRecipe } from "./TextInput.styles";

export interface TextInputProps
  extends Omit<ComponentPropsWithRef<"input">, "size" | "prefix" | "suffix"> {
  size?: "sm" | "md";
  /** Leading adornment, e.g. "£". Decorative: spoken context belongs in the label. */
  prefix?: ReactNode;
  /** Trailing adornment, e.g. "%". */
  suffix?: ReactNode;
  invalid?: boolean;
  /** Classes for the outer bordered wrapper. */
  className?: string;
}

export const TextInput: FC<TextInputProps> = ({
  size = "md",
  prefix,
  suffix,
  invalid = false,
  className,
  disabled,
  type = "text",
  ...inputProps
}) => {
  const classes = textInputRecipe({ size });
  return (
    <div
      className={cx(classes.root, className)}
      data-disabled={disabled ? "true" : undefined}
      // The wrapper draws the one focus ring (:focus-within). Opting out of the app's global
      // :focus-visible outline stops a second ring being drawn around the inner input.
      data-focus-managed=""
      data-invalid={invalid ? "true" : undefined}
    >
      {prefix ? (
        <span aria-hidden="true" className={classes.adornment}>
          {prefix}
        </span>
      ) : null}
      <input
        {...inputProps}
        aria-invalid={invalid || undefined}
        className={classes.input}
        disabled={disabled}
        type={type}
      />
      {suffix ? (
        <span aria-hidden="true" className={classes.adornment}>
          {suffix}
        </span>
      ) : null}
    </div>
  );
};

export default TextInput;
