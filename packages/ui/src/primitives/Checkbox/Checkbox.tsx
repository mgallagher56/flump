import { Check, Minus } from "lucide-react";
import { type ComponentPropsWithRef, type FC, type ReactNode, useCallback, useId } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import { checkboxRecipe } from "./Checkbox.styles";

export interface CheckboxProps
  extends Omit<ComponentPropsWithRef<"input">, "type" | "size" | "children"> {
  /** Visible label (required: the control is always named). */
  label: ReactNode;
  /** Supporting text, wired to the input with aria-describedby. */
  hint?: ReactNode;
  /** Mixed state, e.g. a "select all" over a partly ticked group. Drawn as a dash. */
  indeterminate?: boolean;
  invalid?: boolean;
  /** Classes for the outer wrapper. */
  className?: string;
}

/** Custom-drawn checkbox backed by a real `<input type="checkbox">`. 44px touch target. */
export const Checkbox: FC<CheckboxProps> = ({
  label,
  hint,
  indeterminate = false,
  invalid = false,
  className,
  disabled,
  id,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId.replace(/:/g, "");
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined;
  const classes = checkboxRecipe();

  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = indeterminate;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref, indeterminate],
  );

  return (
    <div className={cx(classes.root, className)}>
      <label
        className={classes.control}
        data-disabled={disabled ? "true" : undefined}
        htmlFor={inputId}
      >
        <input
          {...inputProps}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={classes.input}
          disabled={disabled}
          id={inputId}
          ref={setRef}
          type="checkbox"
        />
        <span aria-hidden="true" className={classes.box}>
          <span className={classes.tick}>
            <Icon icon={Check} size="sm" strokeWidth={2.5} />
          </span>
          <span className={classes.dash}>
            <Icon icon={Minus} size="sm" strokeWidth={2.5} />
          </span>
        </span>
        <span className={classes.label}>{label}</span>
      </label>
      {hint ? (
        <p className={classes.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Checkbox;
