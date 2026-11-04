import { css } from "@repo/ui/styled-system/css";
import { type FC, useMemo } from "react";
import { FiClock, FiShield, FiTrendingUp } from "react-icons/fi";
import FLPText from "~/components/core/typography/FLPText";

export interface AnnualAllowancePillProps {
  type: "isa" | "pension";
  currentAmount: number;
  totalLimit?: number; // £20,000 for ISA, £60,000 for Pension
  taxBand?: "basic" | "higher" | "additional";
  savingsInterest?: number;
}

const pillCardStyle = css({
  backgroundColor: "surface",
  border: "1px solid",
  borderColor: "border",
  borderRadius: "xl",
  padding: { base: "14px 16px", md: "16px 20px" },
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
});

const topRowStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: "10px",
});

const progressTrackStyle = css({
  width: "100%",
  height: "8px",
  backgroundColor: "secondary",
  borderRadius: "full",
  overflow: "hidden",
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
    // 5 April of current year
    let target = new Date(currentYear, 3, 5, 23, 59, 59); // Month is 0-indexed: 3 = April
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
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "full",
              backgroundColor: isIsa ? "rgba(16, 185, 129, 0.12)" : "rgba(99, 102, 241, 0.12)",
              color: isIsa ? "#10b981" : "var(--colors-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
            }}
          >
            {isIsa ? <FiShield /> : <FiTrendingUp />}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ fontSize: "14px", color: "text.primary" }}>
                {isIsa ? "UK ISA Annual Allowance" : "UK Pension Annual Allowance"}
              </strong>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: "full",
                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                  color: "var(--colors-primary)",
                }}
              >
                {formatGBP(limit)} / Tax Year
              </span>
            </div>
            <FLPText color="text.muted" fontSize="xs">
              {formatGBP(remaining)} remaining tax-free capacity
            </FLPText>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "full",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              color: "#d97706",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            <FiClock /> {daysUntilApril5} days left until 5 April
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div>
        <div className={progressTrackStyle}>
          <div
            style={{
              width: `${percentage}%`,
              height: "100%",
              backgroundColor: isIsa ? "#10b981" : "var(--colors-primary)",
              borderRadius: "9999px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "var(--colors-text-muted)",
            marginTop: "4px",
          }}
        >
          <span>
            {formatGBP(used)} contributed ({percentage.toFixed(0)}%)
          </span>
          <span>Max {formatGBP(limit)}</span>
        </div>
      </div>

      {/* Extra helper for Savings page: Personal Savings Allowance */}
      {isIsa && psaLimit > 0 && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--colors-text-muted)",
            borderTop: "1px dashed var(--colors-border)",
            paddingTop: "6px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            💡 <strong>Personal Savings Allowance ({taxBand.toUpperCase()} rate):</strong>{" "}
            {formatGBP(psaLimit)} tax-free interest/yr
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
