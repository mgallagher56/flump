import { KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import { figure, perMonth } from "./PensionSummary.styles";

export interface PensionSummaryProps {
  totalValue: number;
  potsCount: number;
  /** True when a salary is stored, so employee and employer amounts are real figures. */
  hasSalary: boolean;
  monthlyEmployeeContrib: number;
  monthlyEmployerContrib: number;
  directMonthlyContrib: number;
  employeePercent: number;
  employerPercent: number;
  /** Monthly cost of the employee contribution after tax relief; 0 when it cannot be worked out. */
  netMonthlyCost: number;
  taxReliefMonthly: number;
  weightedReturnRate: number;
  /** True when no pot has a growth rate, so `weightedReturnRate` is a placeholder. */
  growthRateIsPlaceholder?: boolean;
}

/**
 * Pension page KPI strip (E15 T3.5). Four cards at most. "Total in your pots" is the page's
 * single `surface.hero` block and falls back to a plain "Not set" card when there are none.
 * Anything that cannot be worked out is passed as null so the card says so instead of showing 0.
 */
const pctFormat = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const PensionSummary: FC<PensionSummaryProps> = ({
  totalValue,
  potsCount,
  hasSalary,
  monthlyEmployeeContrib,
  monthlyEmployerContrib,
  directMonthlyContrib,
  employeePercent,
  employerPercent,
  netMonthlyCost,
  taxReliefMonthly,
  weightedReturnRate,
  growthRateIsPlaceholder = false,
}) => {
  const hasPots = potsCount > 0;
  const pct = (n: number) => `${pctFormat.format(n)}%`;
  // Without a salary the employee and employer amounts are unknown; direct pot payments still count.
  const monthlyTotal = hasSalary
    ? monthlyEmployeeContrib + monthlyEmployerContrib + directMonthlyContrib
    : directMonthlyContrib > 0
      ? directMonthlyContrib
      : null;
  const costKnown = hasSalary && netMonthlyCost > 0;

  return (
    <KpiStrip columns={4}>
      <KpiCard
        label="Total in your pots"
        subtext={
          hasPots
            ? `Across ${potsCount} ${potsCount === 1 ? "pension pot" : "pension pots"}`
            : "Add a pension pot to see its value"
        }
        tone="hero"
        value={hasPots ? <Money size="lg" tone="onContrast" value={totalValue} /> : null}
      />
      <KpiCard
        label="Going in each month"
        subtext={
          monthlyTotal === null
            ? "Add your salary to include your own and your employer's contributions"
            : hasSalary
              ? `Your ${pct(employeePercent)} and your employer's ${pct(employerPercent)} of salary${
                  directMonthlyContrib > 0 ? ", plus payments into your pots" : ""
                }`
              : "Payments into your pots only; salary not set"
        }
        value={
          monthlyTotal === null ? null : (
            <span className={figure}>
              <Money size="lg" value={monthlyTotal} />
              <span className={perMonth}>a month</span>
            </span>
          )
        }
      />
      <KpiCard
        label="Your cost after tax relief"
        subtext={
          costKnown ? (
            taxReliefMonthly > 0 ? (
              <>
                After <Money size="sm" value={taxReliefMonthly} /> a month tax relief on{" "}
                <Money size="sm" value={monthlyEmployeeContrib} /> paid in
              </>
            ) : (
              "No tax relief on your contribution"
            )
          ) : (
            "Needs your salary and contribution rate"
          )
        }
        value={
          costKnown ? (
            <span className={figure}>
              <Money size="lg" value={netMonthlyCost} />
              <span className={perMonth}>a month</span>
            </span>
          ) : null
        }
      />
      <KpiCard
        label="Assumed growth"
        subtext={
          !hasPots
            ? "Set when you add a pot"
            : growthRateIsPlaceholder
              ? "A 5% placeholder: no growth rate is set on your pots"
              : "Average across your pots, weighted by value"
        }
        value={hasPots ? <span className={figure}>{pct(weightedReturnRate)} a year</span> : null}
      />
    </KpiStrip>
  );
};

export default PensionSummary;
