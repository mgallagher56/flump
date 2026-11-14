import { Card, CollapsibleDrawer, Money, Table, TBody, Td, THead, Th, Tr } from "@repo/ui";
import type { FC, ReactNode } from "react";
import {
  bar,
  barLabel,
  barLabels,
  cardBody,
  cardHeader,
  cardTitle,
  drawerBody,
  segment,
  swatch,
  takeHomeRow,
} from "./TakeHomeBreakdown.styles";

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
 * "Where your pay goes": one thin bar, teal for take-home pay and two quiet neutrals for what
 * comes off (tax and National Insurance, then pension and student loan), named at its two ends.
 * The figures are in the KPI strip above, so the table of every part, a month, waits behind a
 * quiet "Show details" disclosure with the other details.
 */
export const TakeHomeBreakdown: FC<TakeHomeBreakdownProps> = ({ details, ...figures }) => {
  const parts = monthlyPayParts(figures);
  const taxAndNi = parts.incomeTax + parts.nationalInsurance;
  const pensionAndLoan = parts.pension + parts.studentLoan;
  const total = parts.takeHome + taxAndNi + pensionAndLoan;
  // Take-home first (teal), then what comes off, with a hairline gap between neighbours.
  const shares = [
    { key: "takeHome", value: parts.takeHome },
    { key: "taxAndNi", value: taxAndNi },
    { key: "pensionAndLoan", value: pensionAndLoan },
  ] as const;
  const visible = shares.filter((s) => s.value > 0);
  const GAP = 0.4;
  let cursor = 0;
  const segments = visible.map((s, i) => {
    const share = total > 0 ? (s.value / total) * 100 : 0;
    const x = cursor;
    cursor += share;
    const width = Math.max(0, share - (i < visible.length - 1 ? GAP : 0));
    return { key: s.key, x, width };
  });
  const rows = TABLE_ORDER.filter((k) => k === "takeHome" || parts[k] > 0);
  // One label per segment, named as the strip names its cards, with the segment's own colour.
  const pensionLabel =
    parts.pension > 0 && parts.studentLoan > 0
      ? "Pension and student loan"
      : parts.pension > 0
        ? "Pension"
        : "Student loan";
  const SEGMENT_LABELS: Record<(typeof shares)[number]["key"], string> = {
    takeHome: PAY_PART_LABELS.takeHome,
    taxAndNi: "Tax and National Insurance",
    pensionAndLoan: pensionLabel,
  };

  return (
    <Card
      aria-labelledby="where-your-pay-goes"
      as="section"
      className={cardBody()}
      data-testid="take-home-breakdown"
      id="take-home-breakdown"
      padding="lg"
    >
      <div className={cardHeader()}>
        <h2 className={cardTitle()} id="where-your-pay-goes">
          Where your pay goes
        </h2>
      </div>

      {/* Decorative: the strip above and the table below carry every value. */}
      <div aria-hidden="true">
        <div className={bar()} data-testid="pay-bar" id="pay-bar">
          {/* A 100-unit-wide SVG stretched to the card: each segment's width is its share. */}
          <svg
            aria-hidden="true"
            focusable="false"
            height="100%"
            preserveAspectRatio="none"
            viewBox="0 0 100 1"
            width="100%"
          >
            {segments.map((s) => (
              <rect
                key={s.key}
                className={segment({ part: s.key })}
                height="1"
                width={s.width}
                x={s.x}
                y="0"
              />
            ))}
          </svg>
        </div>
        {/* A label for each segment, in bar order: in a row from `sm`, stacked on a phone. */}
        <ul className={barLabels()}>
          {visible.map((v) => (
            <li
              key={v.key}
              className={barLabel({ tone: v.key === "takeHome" ? "takeHome" : undefined })}
            >
              <span className={swatch({ part: v.key })} />
              {SEGMENT_LABELS[v.key]}
            </li>
          ))}
        </ul>
      </div>

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
    </Card>
  );
};

export default TakeHomeBreakdown;
