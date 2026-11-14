import {
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxCalculationResult,
  type TaxRecord,
} from "@flump/finance-engine";
import { Button, formatDate, HeroFigure, KpiCard, KpiStrip, kpiMoney, StatusBadge } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import type { FC, ReactNode } from "react";
import { date, root } from "./TaxHeadline.styles";

export interface TaxHeadlineProps {
  taxYear: string;
  records: TaxRecord[];
  result: TaxCalculationResult | undefined;
  /** The page's "Add income" control, offered when the year has no income outside PAYE. */
  emptyAction?: ReactNode;
  /** Opens the add dialog for a cost; offered on the after-costs card when none are recorded. */
  onAddCost?: () => void;
}

/** The bill for tax year "2026/27" is due on 31 January after it ends: 31 Jan 2028. */
export const billDueDate = (taxYear: string): Date => {
  const start = Number.parseInt(taxYear.split("/")[0] ?? "", 10);
  return new Date(Date.UTC(start + 2, 0, 31));
};

/** The due date as a calendar date ("2028-01-31"), so no time zone can move the day. */
const billDueIso = (taxYear: string): string => billDueDate(taxYear).toISOString().slice(0, 10);

/** Income outside PAYE that the user added for the year, before costs. */
export const nonPayeIncome = (records: TaxRecord[], taxYear: string): number =>
  records
    .filter(
      (r) => r.source !== "paye" && r.type === "income" && isRecordActiveInTaxYear(r, taxYear),
    )
    .reduce((sum, r) => sum + getRecordAnnualTotalForTaxYear(r, taxYear), 0);
/** Costs recorded against income outside PAYE for the year. */
export const nonPayeCosts = (records: TaxRecord[], taxYear: string): number =>
  records
    .filter(
      (r) => r.source !== "paye" && r.type === "expense" && isRecordActiveInTaxYear(r, taxYear),
    )
    .reduce((sum, r) => sum + getRecordAnnualTotalForTaxYear(r, taxYear), 0);

/**
 * One plain line when the engine used a trading or property allowance in place of the recorded
 * costs (its `tradingAllowanceUsed` and `propertyAllowanceUsed`; nothing is worked out here).
 */
export const allowanceLine = (
  result: Pick<TaxCalculationResult, "tradingAllowanceUsed" | "propertyAllowanceUsed"> | undefined,
): string | null => {
  const trading = (result?.tradingAllowanceUsed ?? 0) > 0;
  const property = (result?.propertyAllowanceUsed ?? 0) > 0;
  if (trading && property) {
    return "The estimate uses the trading and property allowances, which are more than the costs you recorded.";
  }
  if (trading) {
    return "The estimate uses the trading allowance, which is more than the costs you recorded.";
  }
  if (property) {
    return "The estimate uses the property allowance, which is more than the costs you recorded.";
  }
  return null;
};

/**
 * The first view of the page. The hero holds a saved fact (the income recorded for the year),
 * never an estimate (copy audit ruling 7, coordinator D2). The estimated bill is the first KPI,
 * marked "Estimate", then the income after costs (the total of what each source row shows) and the date the bill is due: a strip of three, never two. Before
 * costs in the hero, after costs beside the bill, so the two reconcile at a glance and the first
 * view holds four figures. The tax year is in the year control beside the heading. With no costs
 * the card says so and offers to add one. With nothing added the
 * hero asks for income and no strip is drawn, so no £0 appears.
 */
export const TaxHeadline: FC<TaxHeadlineProps> = ({
  taxYear,
  records,
  result,
  emptyAction,
  onAddCost,
}) => {
  const income = nonPayeIncome(records, taxYear);
  const hasIncome = income > 0 && result !== undefined;
  const bill = Math.max(0, Math.round(result?.netAdditionalTaxToPay ?? 0));
  const costs = Math.round(nonPayeCosts(records, taxYear));
  const allowance = allowanceLine(result);

  return (
    <section aria-label="Summary" className={root()}>
      <HeroFigure
        emptyAction={emptyAction}
        emptyPrompt="Add income outside PAYE, such as self-employment or rent, to see an estimated tax bill."
        label="Income outside PAYE"
        subline={hasIncome ? "Before costs, this tax year" : undefined}
        value={hasIncome ? income : undefined}
        valueFormat={{ fractionDigits: 0 }}
      />
      {hasIncome ? (
        <KpiStrip columns={3}>
          <KpiCard
            action={<StatusBadge variant="neutral">Estimate</StatusBadge>}
            explain={`Income Tax and National Insurance on your income outside PAYE, after costs, on top of your salary, at ${taxYear} rates.`}
            label="Estimated bill"
            // The allowance changes this figure, so the line about it sits here.
            subtext={allowance ?? "Income Tax and National Insurance on this income"}
            value={bill}
            valueFormat={{ fractionDigits: 0 }}
          />
          <KpiCard
            emptyAction={
              onAddCost ? (
                <Button size="sm" type="button" variant="link" onClick={onAddCost}>
                  Add a cost
                </Button>
              ) : undefined
            }
            label="Income after costs"
            // With no costs recorded the figure would repeat the hero, so the card says so instead.
            notSetLabel="No costs recorded"
            subtext={costs > 0 ? "Your income less the costs you recorded" : undefined}
            value={costs === 0 ? null : Math.round(income - costs)}
            valueFormat={{ fractionDigits: 0 }}
          />
          <KpiCard
            label="Bill due"
            subtext={
              result?.payments.paymentsOnAccountDue
                ? "This year's bill and a first payment on account"
                : "Paid to HMRC"
            }
            value={
              <span className={cx(kpiMoney(), date())}>{formatDate(billDueIso(taxYear))}</span>
            }
          />
        </KpiStrip>
      ) : null}
    </section>
  );
};

export default TaxHeadline;
