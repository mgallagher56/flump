import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo } from "react";
import { FiClock, FiShield, FiTrendingUp } from "react-icons/fi";
import FLPBadge from "~/components/core/badges/FLPBadge";
import FLPProgressBar from "~/components/core/progress/FLPProgressBar";

export interface AnnualAllowancePillProps {
  type: "isa" | "pension";
  currentAmount: number;
  totalLimit?: number; // £20,000 for ISA, £60,000 for Pension
  taxBand?: "basic" | "higher" | "additional";
  savingsInterest?: number;
}

const pillCardStyle = css({
  backgroundColor: "surface",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "border.subtle",
  borderRadius: "xl",
  padding: { base: "16px", md: "20px" },
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: "card",
  height: "100%",
});

const topRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "10px",
});

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const AnnualAllowancePill: FC<AnnualAllowancePillProps> = ({
  type,
  currentAmount,
  totalLimit: customLimit,
  taxBand = "higher",
  savingsInterest = 0,
}) => {
  const isIsa = type === "isa";
  const limit = customLimit ?? (isIsa ? 20000 : 60000);
  const used = Math.max(0, Math.min(currentAmount, limit));
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, (used / limit) * 100);

  // Calculate days until next 5 April
  const daysUntilApril5 = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let target = new Date(currentYear, 3, 5, 23, 59, 59); // 3 = April
    if (now > target) {
      target = new Date(currentYear + 1, 3, 5, 23, 59, 59);
    }
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  // Personal Savings Allowance (PSA)
  const psaLimit = taxBand === "basic" ? 1000 : taxBand === "higher" ? 500 : 0;
  const psaRemaining = Math.max(0, psaLimit - savingsInterest);

  return (
    <div className={pillCardStyle} data-testid={`allowance-pill-${type}`}>
      <div className={topRowStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            className={css({
              width: "32px",
              height: "32px",
              borderRadius: "md",
              backgroundColor: isIsa ? "financial.positiveBg" : "surface.tinted",
              color: isIsa ? "financial.positive" : "primary",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              borderWidth: "1px",
              borderStyle: "solid",
              borderColor: isIsa ? "financial.positiveBorder" : "border.subtle",
              flexShrink: 0,
            })}
          >
            {isIsa ? <FiShield /> : <FiTrendingUp />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                className={css({ fontSize: "sm", fontWeight: "semibold", color: "text.primary" })}
              >
                {isIsa ? "UK ISA Annual Allowance" : "UK Pension Annual Allowance"}
              </span>
              <FLPBadge size="sm" variant="brand">
                {formatGBP(limit)} / Tax Year
              </FLPBadge>
            </div>
            <div
              className={css({
                fontSize: "xs",
                color: "text.muted",
                marginTop: "2px",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              {formatGBP(remaining)} remaining tax-free capacity
            </div>
          </div>
        </div>

        <div>
          <FLPBadge icon={<FiClock />} size="sm" variant="warning">
            {daysUntilApril5} days left until 5 April
          </FLPBadge>
        </div>
      </div>

      {/* Progress Track */}
      <div>
        <FLPProgressBar
          height={6}
          max={limit}
          value={used}
          variant={isIsa ? "positive" : "primary"}
        />
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            fontSize: "xs",
            color: "text.muted",
            marginTop: "6px",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          <span>
            {formatGBP(used)} contributed ({percentage.toFixed(0)}%)
          </span>
          <span>Max {formatGBP(limit)}</span>
        </div>
      </div>

      {/* Extra helper for Savings: Personal Savings Allowance */}
      {isIsa && psaLimit > 0 && (
        <div
          className={css({
            fontSize: "xs",
            color: "text.muted",
            borderTopWidth: "1px",
            borderTopStyle: "solid",
            borderTopColor: "border.subtle",
            paddingTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "4px",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          <span>
            💡 <strong>Personal Savings Allowance ({taxBand} rate):</strong> {formatGBP(psaLimit)}{" "}
            tax-free interest/yr
          </span>
          <span>
            {savingsInterest > 0
              ? `${formatGBP(savingsInterest)} used (${formatGBP(psaRemaining)} left)`
              : "0% tax on non-ISA interest up to limit"}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnnualAllowancePill;
