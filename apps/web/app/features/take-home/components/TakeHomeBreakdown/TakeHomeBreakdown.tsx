import { Card, Money, Table, TBody, Td, THead, Th, Tr } from "@repo/ui";
import type { FC, ReactNode } from "react";
import {
  bar,
  barKey,
  cardBody,
  cardHeader,
  cardSubtitle,
  cardTitle,
  partCell,
  segment,
  swatch,
} from "./TakeHomeBreakdown.styles";

export type PayPartKey = "incomeTax" | "nationalInsurance" | "pension" | "studentLoan" | "takeHome";

/** Row names. Each pay part is named once on the page, here. */
export const PAY_PART_LABELS: Record<PayPartKey, string> = {
  incomeTax: "Income Tax",
  nationalInsurance: "National Insurance",
  pension: "Pension",
  studentLoan: "Student loan",
  takeHome: "Your take-home",
};

export interface TakeHomeBreakdownProps {
  /** Saved salary before tax, a year. Sets the bar's proportions only; it is not printed. */
  salary: number;
  /** Yearly deductions from the saved figures. */
  incomeTax: number;
  nationalInsurance: number;
  pension: number;
  studentLoan: number;
  /** Optional quiet disclosure under the table ("Show details"). */
  details?: ReactNode;
}

interface Part {
  key: PayPartKey;
  annual: number;
  monthly: number;
}

/**
 * "Where your pay goes": a thin stacked bar over one table of what comes off the saved pay, a
 * month, in whole pounds. The swatches key the bar; the take-home segment is keyed by name only,
 * because its figure is the page's estimate card (each pay part appears once).
 */
export const TakeHomeBreakdown: FC<TakeHomeBreakdownProps> = ({
  salary,
  incomeTax,
  nationalInsurance,
  pension,
  studentLoan,
  details,
}) => {
  const deductions: Part[] = [
    { key: "incomeTax", annual: incomeTax, monthly: Math.round(incomeTax / 12) },
    {
      key: "nationalInsurance",
      annual: nationalInsurance,
      monthly: Math.round(nationalInsurance / 12),
    },
    { key: "pension", annual: pension, monthly: Math.round(pension / 12) },
    { key: "studentLoan", annual: studentLoan, monthly: Math.round(studentLoan / 12) },
  ];
  // A part that rounds to nothing a month is left out rather than shown as £0.
  const shown = deductions.filter((p) => p.monthly > 0);
  const takeHomeAnnual = Math.max(
    0,
    salary - incomeTax - nationalInsurance - pension - studentLoan,
  );
  const parts: Part[] = [...shown, { key: "takeHome", annual: takeHomeAnnual, monthly: 0 }];
  const total = parts.reduce((sum, p) => sum + p.annual, 0);
  // Segment x and width in a 0..100 box, with a hairline gap between neighbours.
  const GAP = 0.4;
  let cursor = 0;
  const segments = parts.map((p, i) => {
    const share = total > 0 ? (p.annual / total) * 100 : 0;
    const x = cursor;
    cursor += share;
    const width = Math.max(0, share - (i < parts.length - 1 ? GAP : 0));
    return { key: p.key, x, width };
  });

  return (
    <Card
      aria-labelledby="where-your-pay-goes"
      as="section"
      data-testid="take-home-breakdown"
      id="take-home-breakdown"
      padding="lg"
    >
      <div className={cardBody()}>
        <div className={cardHeader()}>
          <h2 className={cardTitle()} id="where-your-pay-goes">
            Where your pay goes
          </h2>
          <p className={cardSubtitle()}>
            Your pay before tax, split into tax, National Insurance, pension and take-home pay
          </p>
        </div>

        {/* Decorative: the table below carries every value. */}
        <div aria-hidden="true" className={bar()} data-testid="pay-bar" id="pay-bar">
          {/* A 100-unit-wide SVG stretched to the card: each segment's width is its share. */}
          <svg
            aria-hidden="true"
            focusable="false"
            height="100%"
            preserveAspectRatio="none"
            viewBox="0 0 100 1"
            width="100%"
          >
            {total > 0
              ? segments.map((s) => (
                  <rect
                    key={s.key}
                    className={segment({ part: s.key })}
                    height="1"
                    width={s.width}
                    x={s.x}
                    y="0"
                  />
                ))
              : null}
          </svg>
        </div>
        {/* The take-home share is keyed here, not printed again: its figure is the estimate card. */}
        <p className={barKey()}>
          <span aria-hidden="true" className={swatch({ part: "takeHome" })} />
          {PAY_PART_LABELS.takeHome} (the estimate above)
        </p>

        <Table caption="What comes off your pay each month">
          <THead>
            <Tr>
              <Th scope="col">Part</Th>
              <Th numeric scope="col">
                A month
              </Th>
            </Tr>
          </THead>
          <TBody>
            {shown.map((p) => (
              <Tr key={p.key}>
                <Th scope="row">
                  <span className={partCell()}>
                    <span aria-hidden="true" className={swatch({ part: p.key })} />
                    {PAY_PART_LABELS[p.key]}
                  </span>
                </Th>
                <Td label="A month" numeric>
                  <Money size="sm" value={p.monthly} />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>

        {details}
      </div>
    </Card>
  );
};

export default TakeHomeBreakdown;
