import { css } from "@repo/ui/styled-system/css";
import type { FC, HTMLAttributes, ReactNode } from "react";

export type FLPBadgeVariant = "positive" | "warning" | "negative" | "neutral" | "info" | "brand";
export type FLPBadgeSize = "sm" | "md";

export interface FLPBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: FLPBadgeVariant;
  size?: FLPBadgeSize;
  children: ReactNode;
  icon?: ReactNode;
}

const variantStyles: Record<FLPBadgeVariant, string> = {
  positive: css({
    backgroundColor: "financial.positiveBg",
    color: "financial.positive",
    borderColor: "financial.positiveBorder",
  }),
  warning: css({
    backgroundColor: "financial.warningBg",
    color: "financial.warning",
    borderColor: "financial.warningBorder",
  }),
  negative: css({
    backgroundColor: "financial.negativeBg",
    color: "financial.negative",
    borderColor: "financial.negativeBorder",
  }),
  neutral: css({
    backgroundColor: "financial.neutralBg",
    color: "financial.neutral",
    borderColor: "financial.neutralBorder",
  }),
  info: css({
    backgroundColor: "info.bg",
    color: "info.DEFAULT",
    borderColor: "info.border",
  }),
  brand: css({
    backgroundColor: "surface.tinted",
    color: "primary",
    borderColor: "border.subtle",
  }),
};

const sizeStyles: Record<FLPBadgeSize, string> = {
  sm: css({
    padding: "2px 8px",
    fontSize: "xs", // 12px
    lineHeight: "1.25",
  }),
  md: css({
    padding: "4px 10px",
    fontSize: "xs", // 12px
    lineHeight: "1.3",
  }),
};

export const FLPBadge: FC<FLPBadgeProps> = ({
  variant = "neutral",
  size = "sm",
  children,
  icon,
  className,
  ...props
}) => {
  const baseStyle = css({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    borderRadius: "full",
    fontWeight: "semibold",
    borderWidth: "1px",
    borderStyle: "solid",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  });

  return (
    <span
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className || ""}`.trim()}
      {...props}
    >
      {icon && (
        <span className={css({ display: "inline-flex", alignItems: "center" })}>{icon}</span>
      )}
      {children}
    </span>
  );
};

export default FLPBadge;
