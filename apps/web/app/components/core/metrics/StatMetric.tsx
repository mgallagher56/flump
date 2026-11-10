import { css } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";
import FLPBadge, { type FLPBadgeVariant } from "~/components/core/badges/FLPBadge";

export interface StatMetricProps {
  label: string;
  value: ReactNode;
  delta?:
    | {
        text: string;
        variant?: FLPBadgeVariant;
        icon?: ReactNode;
      }
    | ReactNode;
  subtext?: ReactNode;
  tone?: "positive" | "negative" | "warning" | "neutral" | "brand";
  size?: "md" | "lg" | "xl";
  className?: string;
  action?: ReactNode;
}

const toneColorMap = {
  positive: "status.positive.text",
  negative: "status.danger.text",
  warning: "status.warning.text",
  brand: "primary",
  neutral: "text.primary",
};

const sizeMap = {
  md: {
    fontSize: { base: "20px", md: "24px" },
    lineHeight: "1.2",
  },
  lg: {
    fontSize: { base: "24px", md: "30px" },
    lineHeight: "1.15",
  },
  xl: {
    fontSize: { base: "28px", md: "36px" },
    lineHeight: "1.1",
  },
};

export const StatMetric: FC<StatMetricProps> = ({
  label,
  value,
  delta,
  subtext,
  tone = "neutral",
  size = "lg",
  className,
  action,
}) => {
  const containerStyle = css({
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "6px",
    width: "100%",
    height: "100%",
  });

  const eyebrowRowStyle = css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  });

  const labelStyle = css({
    fontSize: "xs", // 12px
    fontWeight: "medium",
    color: "text.muted",
    letterSpacing: "0.01em",
  });

  const valueRowStyle = css({
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "10px",
  });

  const heroValueStyle = css({
    fontFamily: "var(--fonts-display, 'Plus Jakarta Sans', sans-serif)",
    fontWeight: "bold",
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
    color: toneColorMap[tone],
    margin: 0,
    ...sizeMap[size],
  });

  const subtextStyle = css({
    fontSize: "xs", // 13px floor
    color: "text.muted",
    lineHeight: "1.45",
    maxWidth: "65ch",
    margin: 0,
    marginTop: "auto",
    paddingTop: "6px",
    "& strong": {
      color: "text.secondary",
      fontWeight: "semibold",
    },
  });

  const renderDelta = () => {
    if (!delta) return null;
    if (typeof delta === "object" && delta !== null && "text" in delta) {
      const d = delta as { text: string; variant?: FLPBadgeVariant; icon?: ReactNode };
      return (
        <FLPBadge
          icon={d.icon}
          variant={
            d.variant ??
            (tone === "positive" ? "positive" : tone === "negative" ? "negative" : "neutral")
          }
        >
          {d.text}
        </FLPBadge>
      );
    }
    return delta as ReactNode;
  };

  return (
    <div className={`${containerStyle} ${className || ""}`.trim()}>
      <div className={eyebrowRowStyle}>
        <span className={labelStyle}>{label}</span>
        {action && <div>{action}</div>}
      </div>

      <div className={valueRowStyle}>
        <div className={heroValueStyle}>{value}</div>
        {delta && <div>{renderDelta()}</div>}
      </div>

      {subtext && <div className={subtextStyle}>{subtext}</div>}
    </div>
  );
};

export default StatMetric;
