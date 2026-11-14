import { CollapsibleDrawer, Money, Table, TBody, Td, THead, Th, Tr } from "@repo/ui";
import type { FC, ReactNode } from "react";
import { cardBody, drawerBody, takeHomeRow } from "./TakeHomeBreakdown.styles";

export type PayPartKey = "incomeTax" | "nationalInsurance" | "pension" | "studentLoan" | "takeHome";

/** Row names. Each pay part is named once on the page, here. */
export const PAY_PART_LABELS: Record<PayPartKey, string> = {
  incomeTax: "Income Tax",
  nationalInsurance: "National Insurance",
  pension: "Pension",
  studentLoan: "Student loan",
  takeHome: "Take-home pay",
};

export interface PayFigures {
  /** Saved salary before tax, a year. */
  salary: number;
  /** Yearly deductions from the saved figures. */
  incomeTax: number;
  nationalInsurance: number;
  pension: number;
  studentLoan: number;
  /**
   * The engine's yearly take-home. When given, the monthly take-home is this figure divided by 12
   * (the one every other surface shows), and the rounding difference goes to the largest
   * deduction so the parts still add up to the monthly pay before tax.
   */
  takeHome?: number;
}

export type MonthlyPayParts = Record<PayPartKey, number>;

/**
 * Each pay part a month, in whole pounds. The strip and the table both read these, so the figures
 * agree wherever they appear and the parts add up to the monthly pay before tax.
 */
export const monthlyPayParts = (f: PayFigures): MonthlyPayParts => {
  const incomeTax = Math.round(f.incomeTax / 12);
  const nationalInsurance = Math.round(f.nationalInsurance / 12);
  const pension = Math.round(f.pension / 12);
  const studentLoan = Math.round(f.studentLoan / 12);
  const monthlyPay = Math.round(f.salary / 12);
  const derived = Math.max(0, monthlyPay - incomeTax - nationalInsurance - pension - studentLoan);
  const parts = { incomeTax, nationalInsurance, pension, studentLoan, takeHome: derived };
  if (f.takeHome === undefined || !Number.isFinite(f.takeHome)) return parts;
  const takeHome = Math.max(0, Math.round(f.takeHome / 12));
  const difference = derived - takeHome;
  const deductions = ["incomeTax", "nationalInsurance", "pension", "studentLoan"] as const;
  const largest = deductions.reduce((a, b) => (parts[b] > parts[a] ? b : a));
  // Only a rounding difference (a pound or two) is moved; anything larger is left as it is.
  if (Math.abs(difference) > 3 || parts[largest] + difference < 0) return { ...parts, takeHome };
  return { ...parts, [largest]: parts[largest] + difference, takeHome };
};

export interface TakeHomeBreakdownProps extends PayFigures {
  /** Extra content for the quiet "Show details" disclosure, under the table. */
  details?: ReactNode;
}

const TABLE_ORDER: readonly PayPartKey[] = [
  "incomeTax",
  "nationalInsurance",
  "pension",
  "studentLoan",
  "takeHome",
];

/**
 * Every part of the pay, a month, behind one quiet "Show details" disclosure under the KPI strip.
 * The strip already splits the monthly pay, so nothing here is shown until it is opened.
 */
export const TakeHomeBreakdown: FC<TakeHomeBreakdownProps> = ({ details, ...figures }) => {
  const parts = monthlyPayParts(figures);
  const rows = TABLE_ORDER.filter((k) => k === "takeHome" || parts[k] > 0);

  return (
    <section
      aria-label="Where your pay goes"
      className={cardBody()}
      data-testid="take-home-breakdown"
      id="take-home-breakdown"
    >
      <CollapsibleDrawer title="Show details" variant="quiet">
        <div className={drawerBody()}>
          <Table caption="Where your pay goes each month">
            <THead>
              <Tr>
                <Th scope="col">Part</Th>
                <Th numeric scope="col">
                  A month
                </Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((key) => (
                <Tr key={key} className={key === "takeHome" ? takeHomeRow() : undefined}>
                  <Th scope="row">{PAY_PART_LABELS[key]}</Th>
                  <Td label="A month" numeric>
                    <Money size="sm" value={parts[key]} />
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          {details}
        </div>
      </CollapsibleDrawer>
    </section>
  );
};

export default TakeHomeBreakdown;
