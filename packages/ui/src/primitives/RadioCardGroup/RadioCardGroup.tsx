import { AlertCircle, Check } from "lucide-react";
import { type FC, type ReactNode, useId, useState } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import { radioCardGroupRecipe } from "./RadioCardGroup.styles";

export interface RadioCardOption {
  value: string;
  /** Card title, e.g. "Avalanche". */
  label: string;
  /** Supporting sentence, e.g. "Pay the highest interest rate first". */
  description?: ReactNode;
  /** Short tag, e.g. "Saves most interest". */
  badge?: string;
  disabled?: boolean;
}

export interface RadioCardGroupProps {
  /** Group label, rendered as the fieldset `<legend>`. */
  legend: string;
  options: readonly RadioCardOption[];
  /** Controlled value. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Shared radio `name`; defaults to a generated one. */
  name?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Base id; defaults to a generated one. */
  id?: string;
  className?: string;
}

/**
 * Strategy cards as a native radio group: one tab stop, arrow keys move and select, Space selects.
 * Selected state is shown by a filled check indicator and a heavier border, not colour alone.
 */
export const RadioCardGroup: FC<RadioCardGroupProps> = ({
  legend,
  options,
  value,
  defaultValue,
  onValueChange,
  name,
  hint,
  error,
  required = false,
  disabled = false,
  id,
  className,
}) => {
  const generatedId = useId().replace(/:/g, "");
  const baseId = id ?? generatedId;
  const groupName = name ?? baseId;
  const hintId = hint ? `${baseId}-hint` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const [internal, setInternal] = useState(defaultValue);
  const selected = value !== undefined ? value : internal;
  const classes = radioCardGroupRecipe({ invalid: Boolean(error) });

  const select = (next: string) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <fieldset
      aria-describedby={describedBy}
      className={cx(classes.root, className)}
      disabled={disabled}
    >
      <legend className={classes.legend}>{legend}</legend>
      {hint ? (
        <p className={classes.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      <div className={classes.grid}>
        {options.map((option) => {
          const optionId = `${baseId}-${option.value}`;
          const descriptionId = option.description ? `${optionId}-description` : undefined;
          const isDisabled = disabled || option.disabled;
          return (
            <label
              className={classes.card}
              data-disabled={isDisabled ? "true" : undefined}
              htmlFor={optionId}
              key={option.value}
            >
              <input
                aria-describedby={descriptionId}
                checked={selected === option.value}
                className={classes.input}
                disabled={isDisabled}
                id={optionId}
                name={groupName}
                onChange={() => select(option.value)}
                required={required}
                type="radio"
                value={option.value}
              />
              <span aria-hidden="true" className={classes.indicator}>
                <span className={classes.check}>
                  <Icon icon={Check} size="sm" strokeWidth={3} />
                </span>
              </span>
              <span className={classes.body}>
                <span className={classes.titleRow}>
                  <span className={classes.title}>{option.label}</span>
                  {option.badge ? <span className={classes.badge}>{option.badge}</span> : null}
                </span>
                {option.description ? (
                  <span className={classes.description} id={descriptionId}>
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className={classes.error} id={errorId} role="alert">
          <Icon icon={AlertCircle} size="sm" />
          <span className={classes.errorText}>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
};

export default RadioCardGroup;
