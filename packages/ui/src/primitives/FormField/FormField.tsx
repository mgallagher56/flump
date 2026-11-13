import { AlertCircle } from "lucide-react";
import { type FC, type ReactNode, useId } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon/Icon";
import { formFieldRecipe } from "./FormField.styles";

/** Attributes the control must spread (or map) onto its input element. */
export interface FormFieldControlState {
  id: string;
  /** Space-separated ids of the hint and error, or undefined when neither is shown. */
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
}

export interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Visible marker shown beside the label when `required` (default "Required"). */
  requiredText?: string;
  /** Render prop: wire `field` onto the control, e.g. `<TextInput {...controlProps(field)} />`. */
  children: (field: FormFieldControlState) => ReactNode;
  /** Base id; defaults to a generated one. */
  id?: string;
  className?: string;
}

/** Maps the render-prop argument onto standard input attributes. */
export const controlProps = (field: FormFieldControlState) => ({
  id: field.id,
  "aria-describedby": field.describedBy,
  invalid: field.invalid,
  required: field.required,
});

export const FormField: FC<FormFieldProps> = ({
  label,
  hint,
  error,
  required = false,
  requiredText = "Required",
  children,
  id,
  className,
}) => {
  const generatedId = useId();
  const controlId = id ?? generatedId.replace(/:/g, "");
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const classes = formFieldRecipe();

  return (
    <div
      className={cx(classes.root, className)}
      data-testid={`${controlId}-field`}
      id={`${controlId}-field`}
    >
      <label className={classes.label} htmlFor={controlId}>
        {label}
        {required ? (
          // Visible text so the state is not colour-only. The control keeps the native `required`
          // attribute, which assistive technology announces, so the marker is hidden from it to
          // avoid a double announcement.
          <span aria-hidden="true" className={classes.required}>
            {requiredText}
          </span>
        ) : null}
      </label>
      {children({ id: controlId, describedBy, invalid: Boolean(error), required })}
      {hint ? (
        <p className={classes.hint} data-testid={hintId} id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={classes.error} data-testid={errorId} id={errorId} role="alert">
          <Icon icon={AlertCircle} size="sm" />
          <span className={classes.errorText}>{error}</span>
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
