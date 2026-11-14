import {
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxCalculationResult,
  type TaxRecord,
} from "@flump/finance-engine";
import { HeroFigure, KpiCard, KpiStrip } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { date, root } from "./TaxHeadline.styles";

export interface TaxHeadlineProps {
  taxYear: string;
  records: TaxRecord[];
  result: TaxCalculationResult | undefined;
  /** The page's "Add income" control, offered when the year has no income outside PAYE. */
  emptyAction?: ReactNode;
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** The bill for tax year "2026/27" is due on 31 January after it ends: 31 January 2028. */
export const billDueDate = (taxYear: string): Date => {
  const start = Number.parseInt(taxYear.split("/")[0] ?? "", 10);
  return new Date(Date.UTC(start + 2, 0, 31));
};

/** Income outside PAYE that the user added for the year, before costs. */
export const nonPayeIncome = (records: TaxRecord[], taxYear: string): number =>
  records
    .filter(
      (r) => r.source !== "paye" && r.type === "income" && isRecordActiveInTaxYear(r, taxYear),
    )
    .reduce((sum, r) => sum + getRecordAnnualTotalForTaxYear(r, taxYear), 0);
/**
 * The first view of the page. The hero holds a saved fact (the income recorded for the year),
 * never an estimate (copy audit ruling 7, coordinator D2). The estimated bill is the first KPI,
 * marked "Estimate", then the date the bill is due. With nothing added the
 * hero asks for income and no strip is drawn, so no £0 appears.
 */
export const TaxHeadline: FC<TaxHeadlineProps> = ({ taxYear, records, result, emptyAction }) => {
  const income = nonPayeIncome(records, taxYear);
  const hasIncome = income > 0 && result !== undefined;
  const bill = Math.max(0, Math.round(result?.netAdditionalTaxToPay ?? 0));

  return (
    <section aria-label="Summary" className={root()}>
      <HeroFigure
        emptyAction={emptyAction}
        emptyPrompt="Add income outside PAYE, such as self-employment or rent, to see an estimated tax bill."
        label={`Income for ${taxYear}`}
        subline={hasIncome ? "Income outside PAYE that you recorded, before costs" : undefined}
        value={hasIncome ? income : undefined}
        valueFormat={{ fractionDigits: 0 }}
      />
      {hasIncome ? (
        <KpiStrip columns={2}>
          <KpiCard
            label="Estimated bill"
            subtext="Estimate"
            value={bill}
            valueFormat={{ fractionDigits: 0 }}
          />
          <KpiCard
            label="Bill due"
            subtext="Balancing payment date, 31 January after the tax year ends"
            value={<span className={date()}>{dateFormat.format(billDueDate(taxYear))}</span>}
          />
        </KpiStrip>
      ) : null}
    </section>
  );
};

export default TaxHeadline;
