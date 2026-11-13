import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithRef, FC } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import { selectRecipe } from "./Select.styles";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentPropsWithRef<"select">, "size"> {
  size?: "sm" | "md";
  invalid?: boolean;
  /** Short list of options. Alternatively pass `<option>` children. */
  options?: readonly SelectOption[];
  /** Leading empty option (value ""), e.g. "Choose an account". Keeps empty empty. */
  placeholder?: string;
  /** Classes for the outer wrapper. */
  className?: string;
}

/**
 * Styled native `<select>` for short lists. Use inside FormField:
 * `<Select {...controlProps(field)} options={...} />`.
 */
export const Select: FC<SelectProps> = ({
  size = "md",
  invalid = false,
  options,
  placeholder,
  className,
  children,
  ...selectProps
}) => {
  const classes = selectRecipe({ size });
  return (
    <div className={cx(classes.root, className)}>
      <select {...selectProps} aria-invalid={invalid || undefined} className={classes.select}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options?.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <span aria-hidden="true" className={classes.chevron}>
        <Icon icon={ChevronDown} size="md" />
      </span>
    </div>
  );
};

export default Select;
