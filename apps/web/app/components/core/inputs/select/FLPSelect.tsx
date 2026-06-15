import { css } from "@repo/ui/styled-system/css";
import type { FC, SelectHTMLAttributes } from "react";

interface FLPSelectProps
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

  const selectStyle = css({
    width: "100%",
    padding: "10px 14px",
    fontSize: "sm",
    borderRadius: "sm",
    border: "1px solid",
    borderColor: "border",
    backgroundColor: "surface", // Matches card/dialog surface
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
    <div className={containerStyle}>
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
