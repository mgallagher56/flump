import { css } from "@repo/ui/styled-system/css";
import { type FC, type InputHTMLAttributes, useId } from "react";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
  isLabelHidden?: boolean;
  flexDirection?: "row" | "column";
  gap?: number | string;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const FLPInput: FC<FLPInputProps> = ({
  error,
  flexDirection = "column",
  isLabelHidden,
  label,
  onChange,
  gap,
  style,
  className,
  isMobile: propIsMobile,
  variant = "desktop",
  id: propId,
  "aria-describedby": ariaDescribedBy,
  ...props
}) => {
  const generatedId = useId();
  const id = propId ?? generatedId;
  const errorId = `${id}-error`;
  const describedBy =
    [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ") || undefined;
  const { isMobile: contextIsMobile } = useResponsive();
  const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);
  const resolvedDirection = isMobileVariant ? "column" : flexDirection;

  const containerStyle = css({
    display: "flex",
    flexDirection: resolvedDirection,
    alignItems: resolvedDirection === "row" ? "center" : "stretch",
    gap: gap || (resolvedDirection === "row" ? "16px" : "8px"),
    width: "100%",
  });

  const labelStyle = css({
    fontSize: "sm",
    fontWeight: "medium",
    color: "text.primary",
  });

  const inputStyle = css({
    width: "100%",
    padding: isMobileVariant ? "12px 14px" : "8px 14px",
    minHeight: isMobileVariant ? "44px" : "40px",
    fontSize: isMobileVariant ? "16px" : "sm",
    borderRadius: "md",
    border: "1px solid",
    borderColor: "border.input",
    backgroundColor: "surface",
    color: "text.primary",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
    fontVariantNumeric: "tabular-nums",
    _focus: {
      borderColor: "primary",
      boxShadow: "0 0 0 2px token(colors.primary)",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    "&[type='number']": {
      appearance: "textfield",
      fontVariantNumeric: "tabular-nums",
      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
        WebkitAppearance: "none",
        margin: 0,
      },
    },
  });

  const errorStyle = css({
    color: "status.danger.text",
    fontSize: "xs",
    fontWeight: "medium",
    marginTop: "4px",
  });

  return (
    <div className={containerStyle} data-variant={isMobileVariant ? "mobile" : "desktop"}>
      {!isLabelHidden && (
        <label className={labelStyle} htmlFor={id}>
          {label}
        </label>
      )}
      <div style={{ flex: 1 }}>
        <input
          data-focus-managed=""
          className={`${inputStyle} ${className || ""}`}
          id={id}
          style={style}
          onChange={onChange}
          {...props}
          aria-describedby={describedBy}
          aria-invalid={error ? true : props["aria-invalid"]}
          aria-label={isLabelHidden ? label : props["aria-label"]}
        />
        {error && (
          <span className={errorStyle} id={errorId} role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
};

export default FLPInput;
