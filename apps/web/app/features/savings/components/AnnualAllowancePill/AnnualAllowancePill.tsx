import { Icon, ProgressBar, StatusBadge } from "@repo/ui";
import { Clock, PiggyBank, TrendingUp } from "lucide-react";
import { type FC, useMemo } from "react";
import {
  pillHeader,
  pillIcon,
  pillIdentity,
  pillRoot,
  pillSubtitle,
  pillTitle,
  psaRow,
  scopeBox,
  usageRow,
  usageStrong,
} from "./AnnualAllowancePill.styles";

export interface AnnualAllowancePillProps {
  type: "isa" | "pension";
  currentAmount: number;
  /** £20,000 for an ISA, £60,000 for a pension when omitted. */
  totalLimit?: number;
  /** From the saved income and tax region. Omitted when income is unknown: no band is claimed. */
  taxBand?: "basic" | "higher" | "additional";
  savingsInterest?: number;
  contributingAccounts?: Array<{ name: string; balance: number }>;
}

const formatGBP = (num: number) => `£${Math.max(0, Math.round(num)).toLocaleString("en-GB")}`;

export const AnnualAllowancePill: FC<AnnualAllowancePillProps> = ({
  type,
  currentAmount,
  totalLimit: customLimit,
  taxBand,
  savingsInterest = 0,
  contributingAccounts,
}) => {
  const isIsa = type === "isa";
  const limit = customLimit ?? (isIsa ? 20000 : 60000);
  const used = Math.max(0, Math.min(currentAmount, limit));
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, (used / limit) * 100);
  const progressVariant =
    percentage >= 100 ? "danger" : percentage >= 85 ? "warning" : isIsa ? "positive" : "primary";

  // Days until the next 5 April, when the tax year ends.
  const daysUntilApril5 = useMemo(() => {
    const now = new Date();
    let target = new Date(now.getFullYear(), 3, 5, 23, 59, 59);
    if (now > target) {
      target = new Date(now.getFullYear() + 1, 3, 5, 23, 59, 59);
    }
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, []);

  // Personal Savings Allowance (PSA)
  const psaLimit =
    taxBand === undefined ? null : taxBand === "basic" ? 1000 : taxBand === "higher" ? 500 : 0;
  const psaRemaining = Math.max(0, (psaLimit ?? 0) - savingsInterest);

  return (
    <div
      className={pillRoot()}
      data-testid={`allowance-pill-${type}`}
      id={`allowance-pill-${type}`}
    >
      <div className={pillHeader()}>
        <div className={pillIdentity()}>
          <span className={pillIcon()}>
            <Icon icon={isIsa ? PiggyBank : TrendingUp} size="md" />
          </span>
          <div>
            <h3 className={pillTitle()}>{isIsa ? "ISA allowance" : "Pension allowance"}</h3>
            <p className={pillSubtitle()}>{formatGBP(remaining)} left to use this tax year</p>
          </div>
        </div>
        <StatusBadge size="sm" variant="warning">
          <Icon icon={Clock} size="sm" />
          {daysUntilApril5} {daysUntilApril5 === 1 ? "day" : "days"} until 5 April
        </StatusBadge>
      </div>

      <div>
        <div className={usageRow()}>
          <span>
            <span className={usageStrong()}>{formatGBP(used)}</span> used ({percentage.toFixed(0)}%)
          </span>
          <span>Limit {formatGBP(limit)} a tax year</span>
        </div>
        <ProgressBar
          height={10}
          label={isIsa ? "ISA allowance used" : "Pension allowance used"}
          max={limit}
          value={used}
          valueDisplay={`${formatGBP(used)} / ${formatGBP(limit)}`}
          valueText={`${formatGBP(used)} of ${formatGBP(limit)} used`}
          variant={progressVariant}
        />
      </div>

      <div className={scopeBox()}>
        <span>
          <strong>Counts towards it:</strong>{" "}
          {isIsa
            ? contributingAccounts && contributingAccounts.length > 0
              ? contributingAccounts
                  .map((acc) => `${acc.name} (${formatGBP(acc.balance)})`)
                  .join(", ")
              : "cash ISAs, stocks and shares ISAs and Lifetime ISAs."
            : "workplace pension, SIPP and personal pension contributions."}
        </span>
        {isIsa && <span>Resets 6 April</span>}
      </div>

      {isIsa && psaLimit === null && (
        <div className={psaRow()}>
          <span>
            <strong>Personal Savings Allowance:</strong> up to £1,000 of interest a year without
            tax, depending on your income tax band
          </span>
          <span>Add your income to see your allowance</span>
        </div>
      )}

      {isIsa && psaLimit !== null && psaLimit > 0 && (
        <div className={psaRow()}>
          <span>
            <strong>Personal Savings Allowance ({taxBand} rate):</strong> {formatGBP(psaLimit)} of
            interest a year without tax
          </span>
          <span>
            {savingsInterest > 0
              ? `${formatGBP(savingsInterest)} used, ${formatGBP(psaRemaining)} left`
              : "No tax on interest outside an ISA up to this limit"}
          </span>
        </div>
      )}
    </div>
  );
};

export default AnnualAllowancePill;
