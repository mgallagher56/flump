import { Check } from "lucide-react";
import { type ComponentPropsWithRef, type FC, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import { switchRecipe } from "./Switch.styles";

export interface SwitchProps
  extends Omit<ComponentPropsWithRef<"input">, "type" | "size" | "children" | "role"> {
  /** Visible label naming the setting, e.g. "Email me monthly summaries". */
  label: ReactNode;
  hint?: ReactNode;
  /** Classes for the outer wrapper. */
  className?: string;
}

/**
 * Real `<input type="checkbox" role="switch">`. On/off is shown by thumb position and a tick in
 * the thumb as well as colour; assistive technology announces the checked state.
 */
export const Switch: FC<SwitchProps> = ({
  label,
  hint,
  className,
  disabled,
  id,
  "aria-describedby": ariaDescribedBy,
  ...inputProps
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId.replace(/:/g, "");
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [ariaDescribedBy, hintId].filter(Boolean).join(" ") || undefined;
  const classes = switchRecipe();

  return (
    <div className={cx(classes.root, className)}>
      <label
        className={classes.control}
        data-disabled={disabled ? "true" : undefined}
        htmlFor={inputId}
      >
        <span className={classes.text}>
          <span className={classes.label}>{label}</span>
        </span>
        <input
          {...inputProps}
          aria-describedby={describedBy}
          className={classes.input}
          disabled={disabled}
          id={inputId}
          // biome-ignore lint/a11y/useAriaPropsForRole: native checkbox exposes checked state to role=switch
          role="switch"
          type="checkbox"
        />
        <span aria-hidden="true" className={classes.track}>
          <span className={classes.thumb}>
            <span className={classes.tick}>
              <Icon icon={Check} size="sm" strokeWidth={3} />
            </span>
          </span>
        </span>
      </label>
      {hint ? (
        <p className={classes.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Switch;
