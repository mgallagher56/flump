import { css } from "@repo/ui/styled-system/css";
import type { FC, InputHTMLAttributes } from "react";

interface FLPInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
  isLabelHidden?: boolean;
  flexDirection?: "row" | "column";
  gap?: number | string;
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
  ...props
}) => {
  const containerStyle = css({
    display: "flex",
    flexDirection,
    alignItems: flexDirection === "row" ? "center" : "stretch",
    gap: gap || (flexDirection === "row" ? "16px" : "8px"),
    width: "100%",
  });

  const labelStyle = css({
    fontSize: "sm",
    fontWeight: "medium",
    color: "text.primary",
  });

  const inputStyle = css({
    width: "100%",
    padding: "10px 14px",
    fontSize: "sm",
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
  });

  const errorStyle = css({
    color: "destructive",
    fontSize: "xs",
    fontWeight: "medium",
    marginTop: "4px",
  });

  return (
    <div className={containerStyle}>
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
