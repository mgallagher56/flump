import type { TaxCalculationResult } from "@flump/finance-engine";
import { KpiCard, KpiStrip, Money } from "@repo/ui";
import type { FC } from "react";
import TaxEstimateNote from "~/components/tax/TaxEstimateNote";
import { NotSet } from "~/features/feedback/components/NotSet";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { heroSubtext, kpiSubtext, root, sectionHeading } from "./TaxHeadline.styles";

export interface TaxHeadlineProps {
  taxYear: string;
  result: TaxCalculationResult;
  /** Property ownership share, 0 to 100. */
  ownershipSharePct: number;
}

const percent = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/**
 * The page's one hero (estimated Self Assessment bill) and the "Where you stand" strip.
 * Figures come straight from `calculateUKTax`; nothing is recomputed here.
 */
export const TaxHeadline: FC<TaxHeadlineProps> = ({ taxYear, result, ownershipSharePct }) => {
  const { formatCurrency } = useFormatCurrency();
  const salary = result.effectivePayeSalary;

  return (
    <section aria-label={`Tax summary for ${taxYear}`} className={root()}>
      <KpiCard
        label={`Estimated Self Assessment due for ${taxYear}`}
        tone="hero"
        value={<Money size="kpi" tone="onContrast" value={result.netAdditionalTaxToPay} />}
        subtext={
          <span className={heroSubtext()}>
            <span>Tax and Class 4 National Insurance on top of what PAYE already takes.</span>
            <TaxEstimateNote taxYear={taxYear} tone="onContrast" />
          </span>
        }
      />

      <h2 className={sectionHeading()}>Where you stand</h2>
      <KpiStrip columns={3}>
        <KpiCard
          label="Total income"
          value={<Money size="lg" value={result.totalGrossIncome} />}
          subtext={
            <span className={kpiSubtext()}>
              Salary{" "}
              {salary && salary > 0 ? (
                formatCurrency(salary)
              ) : (
                <NotSet href="/app/profile" subject="salary" />
              )}{" "}
              plus business, rental and savings income
            </span>
          }
        />
        <KpiCard
          label="Your share of rental profit"
          value={<Money size="lg" value={result.rentalProfitPostInterestShare} />}
          subtext={
            <span className={kpiSubtext()}>
              {percent.format(ownershipSharePct)}% of{" "}
              {formatCurrency(result.rentalProfitPostInterest)} after mortgage interest
            </span>
          }
        />
        <KpiCard
          label="Self-employed profit"
          value={<Money size="lg" value={result.seProfit} />}
          subtext={
            <span className={kpiSubtext()}>
              Turnover {formatCurrency(result.seIncomeGross)} less allowable costs
            </span>
          }
        />
      </KpiStrip>
    </section>
  );
};

export default TaxHeadline;
