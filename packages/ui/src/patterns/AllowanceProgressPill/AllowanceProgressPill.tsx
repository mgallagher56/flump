import { type FC, useMemo } from "react";
import { css, cx } from "../../../styled-system/css";
import { ProgressBar } from "../../primitives/ProgressBar/ProgressBar";
import { StatusBadge } from "../../primitives/StatusBadge/StatusBadge";
import { allowanceCardContainer, allowanceHeader } from "./AllowanceProgressPill.styles";

export interface AllowanceProgressPillProps {
  type: "isa" | "pension";
  currentAmount: number;
  totalLimit?: number;
  taxBand?: "basic" | "higher" | "additional";
  savingsInterest?: number;
  className?: string;
}

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const AllowanceProgressPill: FC<AllowanceProgressPillProps> = ({
  type,
  currentAmount,
  totalLimit: customLimit,
  taxBand: _taxBand = "higher",
  savingsInterest: _savingsInterest = 0,
  className,
}) => {
  const isIsa = type === "isa";
  const limit = customLimit ?? (isIsa ? 20000 : 60000);
  const used = Math.max(0, Math.min(currentAmount, limit));
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, (used / limit) * 100);
  const progressVariant =
    percentage >= 100 ? "danger" : percentage >= 85 ? "warning" : isIsa ? "positive" : "primary";

  // Days until next 5 April
  const daysUntilApril5 = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let target = new Date(currentYear, 3, 5, 23, 59, 59);
    if (now > target) {
      target = new Date(currentYear + 1, 3, 5, 23, 59, 59);
    }
    const diffMs = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, []);

  return (
    <div className={cx(allowanceCardContainer(), className)} data-testid={`allowance-pill-${type}`}>
      <div className={allowanceHeader()}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              className={css({ fontSize: "sm", fontWeight: "semibold", color: "text.primary" })}
            >
              {isIsa ? "UK ISA Annual Allowance" : "UK Pension Annual Allowance"}
            </span>
            <StatusBadge size="sm" variant="brand">
              {formatGBP(limit)} / Tax Year
            </StatusBadge>
          </div>
          <div
            className={css({
              fontSize: "xs",
              color: "text.muted",
              mt: "2px",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            {formatGBP(remaining)} remaining tax-free capacity
          </div>
        </div>

        <div>
          <StatusBadge size="sm" variant="warning">
            {daysUntilApril5} days left until 5 April
          </StatusBadge>
        </div>
      </div>

      <div className={css({ display: "flex", flexDirection: "column", gap: "8px" })}>
        <div
          className={css({
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            fontSize: "xs",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          <span className={css({ fontWeight: "semibold", color: "text.primary" })}>
            {formatGBP(used)}{" "}
            <span className={css({ color: "text.muted", fontWeight: "normal" })}>
              contributed ({percentage.toFixed(0)}%)
            </span>
          </span>
          <span className={css({ color: "text.muted" })}>Max {formatGBP(limit)}</span>
        </div>
        <ProgressBar height={8} max={limit} value={used} variant={progressVariant} />
      </div>

      <div
        className={css({
          fontSize: "xs",
          color: "text.muted",
          backgroundColor: "surface.sunken",
          p: "8px 12px",
          borderRadius: "lg",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "border.subtle",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "6px",
        })}
      >
        <span>
          <strong>Scope:</strong>{" "}
          {isIsa
            ? "Cash ISAs, Stocks & Shares ISAs, and Lifetime ISAs."
            : "Workplace pension, SIPP, and personal pension contributions."}
        </span>
        <span className={css({ color: "primary", fontWeight: "semibold" })}>Resets 6 April</span>
      </div>
    </div>
  );
};

export default AllowanceProgressPill;
