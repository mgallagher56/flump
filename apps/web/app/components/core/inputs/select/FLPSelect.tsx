import { css } from "@repo/ui/styled-system/css";
import type { FC, SelectHTMLAttributes } from "react";
import { useResponsive } from "~/context/ResponsiveContext";

export interface FLPSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> {
  label: string;
  isLabelHidden?: boolean;
  flexDirection?: "row" | "column";
  gap?: number | string;
  collection: {
    items: { id: string; name: string }[];
  };
  value: string[];
  onValueChange: (e: { value: string[] }) => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

const FLPSelect: FC<FLPSelectProps> = ({
  collection,
  flexDirection = "column",
  gap,
  isLabelHidden,
  label,
  value,
  onValueChange,
  className,
  style,
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

  const selectStyle = css({
    width: "100%",
    padding: isMobileVariant ? "12px 14px" : "10px 14px",
    minHeight: isMobileVariant ? "44px" : undefined,
    fontSize: isMobileVariant ? "16px" : "sm",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface",
    color: "text.primary",
    outline: "none",
    transition: "all 0.2s",
    cursor: "pointer",
    _focus: {
      borderColor: "primary",
      boxShadow: "0 0 0 1px token(colors.primary)",
    },
  });

  return (
    <div className={containerStyle} data-variant={isMobileVariant ? "mobile" : "desktop"}>
      {!isLabelHidden && (
        <label className={labelStyle} htmlFor={label}>
          {label}
        </label>
      )}
      <div style={{ flex: 1 }}>
        <select
          className={`${selectStyle} ${className || ""}`}
          id={label}
          style={style}
          value={value?.[0] || ""}
          onChange={(e) => onValueChange({ value: [e.target.value] })}
          {...props}
        >
          {collection.items.map((item) => (
            <option
              key={item.id}
              style={{
                backgroundColor: "var(--colors-surface)",
                color: "var(--colors-text-primary)",
              }}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default FLPSelect;
