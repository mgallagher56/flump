import { css } from "@repo/ui/styled-system/css";
import type { FC, InputHTMLAttributes } from "react";
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
  ...props
}) => {
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
    padding: isMobileVariant ? "12px 14px" : "10px 14px",
    minHeight: isMobileVariant ? "44px" : undefined,
    fontSize: isMobileVariant ? "16px" : "sm",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "transparent",
    color: "text.primary",
    outline: "none",
    transition: "all 0.2s",
    _focus: {
      borderColor: "primary",
      boxShadow: "0 0 0 1px token(colors.primary)",
    },
    _disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    "&[type='number']": {
      appearance: "textfield",
      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
        WebkitAppearance: "none",
        margin: 0,
      },
    },
  });

  const errorStyle = css({
    color: "destructive",
    fontSize: "xs",
    fontWeight: "medium",
    marginTop: "4px",
  });

  return (
    <div className={containerStyle} data-variant={isMobileVariant ? "mobile" : "desktop"}>
      {!isLabelHidden && (
        <label className={labelStyle} htmlFor={label}>
          {label}
        </label>
      )}
      <div style={{ flex: 1 }}>
        <input
          className={`${inputStyle} ${className || ""}`}
          id={label}
          style={style}
          onChange={onChange}
          {...props}
        />
        {error && <span className={errorStyle}>{error}</span>}
      </div>
    </div>
  );
};

export default FLPInput;
