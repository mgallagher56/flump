import { css, cx } from "@repo/ui/styled-system/css";
import type React from "react";
import { forwardRef, useId, useState } from "react";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: string;
  size?: "sm" | "md" | "lg";
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  onCheckedChange?: (checked: boolean) => void;
}

const CheckIcon = ({ size }: { size: "sm" | "md" | "lg" }) => {
  const iconSize = size === "sm" ? 10 : size === "lg" ? 14 : 12;
  return (
    <svg aria-hidden="true" fill="none" height={iconSize} viewBox="0 0 12 12" width={iconSize}>
      <path
        d="M2.5 6.2L4.7 8.5L9.5 3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

export const FLPCheckbox = forwardRef<HTMLInputElement, FLPCheckboxProps>(
  (
    {
      id: propId,
      checked: propChecked,
      defaultChecked,
      disabled = false,
      error,
      label,
      description,
      size = "md",
      className,
      style,
      containerClassName,
      containerStyle,
      isMobile: propIsMobile,
      variant = "desktop",
      onChange,
      onCheckedChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = propId || generatedId;

    const { isMobile: contextIsMobile } = useResponsive();
    const isMobileVariant = propIsMobile ?? (variant === "mobile" ? true : contextIsMobile);

    const isControlled = propChecked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = useState(Boolean(defaultChecked));
    const [isFocusVisible, setIsFocusVisible] = useState(false);

    const isChecked = isControlled ? Boolean(propChecked) : uncontrolledChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      if (!isControlled) {
        setUncontrolledChecked(e.target.checked);
      }
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    const containerCss = css({
      display: "inline-flex",
      alignItems: "flex-start",
      gap: size === "sm" ? "8px" : "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      userSelect: "none",
      position: "relative",
      lineHeight: "1.4",
      opacity: disabled ? 0.6 : 1,
    });

    const boxDimension = size === "sm" ? "16px" : size === "lg" ? "22px" : "18px";
    const boxRadius = size === "sm" ? "4px" : "5px";

    const boxCss = css({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: boxDimension,
      height: boxDimension,
      borderRadius: boxRadius,
      border: "1.5px solid",
      borderColor: isChecked ? "primary" : "border",
      backgroundColor: isChecked ? "primary" : "surface",
      color: "#ffffff",
      transition: "all 0.15s ease-in-out",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      marginTop: size === "sm" ? "1px" : "2px",
      _hover: {
        borderColor: !disabled && !isChecked ? "primary" : undefined,
      },
    });

    const focusCss = css({
      borderColor: "primary",
      boxShadow: "0 0 0 2px token(colors.primary)",
    });

    const labelTextCss = css({
      fontSize: size === "sm" ? "xs" : size === "lg" ? "md" : "sm",
      fontWeight: "medium",
      color: "text.primary",
      display: "flex",
      flexDirection: "column",
      gap: "2px",
    });

    const descCss = css({
      fontSize: "xs",
      color: "text.muted",
      fontWeight: "normal",
    });

    const errorCss = css({
      fontSize: "xs",
      color: "destructive",
      fontWeight: "medium",
      marginTop: "2px",
    });

    return (
      <div
        className={cx(containerCss, containerClassName)}
        data-disabled={disabled ? "true" : undefined}
        data-size={size}
        data-variant={isMobileVariant ? "mobile" : "desktop"}
        style={containerStyle}
      >
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <input
            ref={ref}
            checked={isChecked}
            className={className}
            data-flp-checkbox="true"
            disabled={disabled}
            id={id}
            style={{
              position: "absolute",
              opacity: 0,
              width: "100%",
              height: "100%",
              top: 0,
              left: 0,
              margin: 0,
              cursor: disabled ? "not-allowed" : "pointer",
              zIndex: 1,
              ...style,
            }}
            type="checkbox"
            onBlur={() => setIsFocusVisible(false)}
            onChange={handleChange}
            onFocus={(e) => {
              if (e.target.matches(":focus-visible")) {
                setIsFocusVisible(true);
              }
            }}
            {...props}
          />
          <div
            aria-hidden="true"
            className={cx(boxCss, isFocusVisible && focusCss)}
            data-checked={isChecked ? "true" : undefined}
          >
            {isChecked && <CheckIcon size={size} />}
          </div>
        </div>

        {(label || description || error) && (
          <label
            className={labelTextCss}
            htmlFor={id}
            style={{ cursor: disabled ? "not-allowed" : "pointer" }}
          >
            {label && <span>{label}</span>}
            {description && <span className={descCss}>{description}</span>}
            {error && <span className={errorCss}>{error}</span>}
          </label>
        )}
      </div>
    );
  },
);

FLPCheckbox.displayName = "FLPCheckbox";

export default FLPCheckbox;
