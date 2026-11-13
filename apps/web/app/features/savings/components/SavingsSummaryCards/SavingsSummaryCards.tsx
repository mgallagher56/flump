import { KpiCard, KpiStrip, Money, Num } from "@repo/ui";
import type { FC } from "react";
import { section, sectionTitle, summaryRoot } from "./SavingsSummaryCards.styles";

export interface SavingsSummaryCardsProps {
  totalSavingsBalance: number;
  totalMonthlySavings: number;
  weightedInterestRate: number;
  projectedTenYearBalance: number;
  accountCount: number;
  estimatedAnnualInterest?: number;
  monthlyTakeHome?: number | null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One hero for the total saved, then a single "Where you stand" strip of four figures. */
export const SavingsSummaryCards: FC<SavingsSummaryCardsProps> = ({
  totalSavingsBalance,
  totalMonthlySavings,
  weightedInterestRate,
  projectedTenYearBalance,
  accountCount,
  estimatedAnnualInterest,
  monthlyTakeHome,
}) => {
  const safeRate = Number(weightedInterestRate) || 0;

  // 12 months of compounding with the regular monthly saving, used when no estimate is passed in.
  const monthlyRate = safeRate / 100 / 12;
  let balAfterOneYear = totalSavingsBalance;
  for (let m = 0; m < 12; m++) {
    balAfterOneYear = balAfterOneYear * (1 + monthlyRate) + totalMonthlySavings;
  }
  const compoundOneYearInterest = Math.max(
    0,
    balAfterOneYear - totalSavingsBalance - totalMonthlySavings * 12,
  );
  const yearlyInterest = estimatedAnnualInterest ?? compoundOneYearInterest;

  const takeHome = Number(monthlyTakeHome) || 0;
  const savingsRate =
    takeHome > 0 && totalMonthlySavings > 0 ? (totalMonthlySavings / takeHome) * 100 : null;

  return (
    <div className={summaryRoot()}>
      <KpiCard
        label="Total savings"
        subtext={`Across ${plural(accountCount, "savings or investment account", "savings and investment accounts")}`}
        tone="hero"
        value={totalSavingsBalance}
      />

      <section aria-labelledby="savings-stand-heading" className={section()}>
        <h2 className={sectionTitle()} id="savings-stand-heading">
          Where you stand
        </h2>
        <KpiStrip columns={4}>
          <KpiCard
            label="Saved each month"
            subtext={
              savingsRate === null ? (
                "Regular saving across your accounts"
              ) : (
                <>
                  <Num
                    fractionDigits={1}
                    kind="percent"
                    size="sm"
                    tone="muted"
                    value={savingsRate}
                  />{" "}
                  of your take-home pay
                </>
              )
            }
            value={<Money size="lg" value={totalMonthlySavings} />}
          />
          <KpiCard
            label="Average interest rate"
            subtext="Weighted by balance (AER)"
            value={<Num fractionDigits={2} kind="percent" size="lg" value={safeRate} />}
          />
          <KpiCard
            label="Interest in a year"
            subtext="Estimate at today's rates"
            value={<Money size="lg" value={Math.round(yearlyInterest)} />}
          />
          <KpiCard
            label="Projected in 10 years"
            subtext="Projection from your current saving and rates"
            value={<Money size="lg" value={Math.round(projectedTenYearBalance)} />}
          />
        </KpiStrip>
      </section>
    </div>
  );
};

export default SavingsSummaryCards;
