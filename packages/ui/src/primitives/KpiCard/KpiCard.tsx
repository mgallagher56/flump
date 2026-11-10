import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { StatusBadge, type StatusBadgeVariants } from "../StatusBadge/StatusBadge";
import { kpiCardContainer, kpiEyebrow, kpiHeroValue, kpiLabel, kpiSubtext } from "./KpiCard.styles";

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  deltaText?: string;
  deltaVariant?: StatusBadgeVariants["variant"];
  subtext?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const KpiCard: FC<KpiCardProps> = ({
  label,
  value,
  deltaText,
  deltaVariant = "neutral",
  subtext,
  action,
  className,
}) => {
  return (
    <div className={cx(kpiCardContainer(), className)}>
      <div className={kpiEyebrow()}>
        <span className={kpiLabel()}>{label}</span>
        {action && <div>{action}</div>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "8px" }}>
        <div className={kpiHeroValue()}>{value}</div>
        {deltaText && (
          <StatusBadge size="sm" variant={deltaVariant}>
            {deltaText}
          </StatusBadge>
        )}
      </div>

      {subtext && <div className={kpiSubtext()}>{subtext}</div>}
    </div>
  );
};

export default KpiCard;
