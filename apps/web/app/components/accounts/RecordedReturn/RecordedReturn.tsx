import {
  estimateRecordedReturn,
  MIN_RECORDED_RETURN_MONTHS,
  type RecordedBalance,
} from "@flump/finance-engine";
import { type FC, useMemo } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { isFutureMonth } from "~/utils/accounts";
import {
  recordedReturnFigure,
  recordedReturnHeading,
  recordedReturnList,
  recordedReturnNote,
  recordedReturnRoot,
  recordedReturnRow,
  recordedReturnTerm,
} from "./RecordedReturn.styles";

export interface RecordedReturnProps {
  /** Recorded monthly balances (any order). Leave out any month that is not recorded yet. */
  balances: readonly RecordedBalance[];
  /** The account's monthly contribution setting, assumed paid in every month. */
  monthlyContribution?: number | null;
  /** The user's own "Estimated annual return" (5 means 5%), shown beside the figures if set. */
  assumedAnnualReturn?: number | null;
  /** Heading text; defaults to `RECORDED_RETURN_HEADING`. */
  heading?: string;
  /** Unique per page: used for the heading id. */
  id: string;
  headingLevel?: "h2" | "h3" | "h4";
}

/**
 * The recorded months of an investment account for its estimated return: months up to now only,
 * never the carried saved balance (the estimate uses balances the person recorded).
 */
export const recordedReturnBalances = (
  details: readonly { month?: unknown; year?: unknown; value?: unknown }[],
): { year: number; month: number; value: number }[] =>
  details
    .map((d) => ({ month: Number(d.month), year: Number(d.year), value: Number(d.value) }))
    .filter(
      (d) =>
        Number.isInteger(d.month) &&
        Number.isInteger(d.year) &&
        Number.isFinite(d.value) &&
        !isFutureMonth(d.month, d.year),
    );

export const RECORDED_RETURN_HEADING = "Estimated return from your recorded balances";

const percentOneDp = new Intl.NumberFormat("en-GB", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** A fraction as a percentage to 1 decimal place: 0.0412 -> "4.1%", -0.05 -> "-5.0%". */
export const formatReturn = (fraction: number): string => {
  const rounded = Math.round(fraction * 1000) / 1000;
  // No "-0.0%" for a tiny fall that rounds to nothing.
  return percentOneDp.format(rounded === 0 ? 0 : rounded);
};

/** The user's typed rate, shown as typed to at most 2 decimal places: 5 -> "5%". */
const formatTypedRate = (percent: number): string =>
  `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(percent)}%`;

/** "2025", or "2024 (5 months)" for a year with fewer than 12 months measured. */
export const yearLabel = (year: number, months: number): string =>
  months >= 12 ? String(year) : `${year} (${months} ${months === 1 ? "month" : "months"})`;

export const overallLabel = (months: number, annualised: boolean): string =>
  annualised ? "Overall, a year on average" : `Overall, over ${months} months`;

/**
 * The return an investment account made, estimated from its recorded monthly balances (owner item
 * 10b): one figure per calendar year and one overall, worked out by `estimateRecordedReturn` in
 * the finance engine. A past figure, never a prediction. The user's own assumed return sits beside
 * it as a plain fact, with no comparison in words or colour; a fall shows with a minus sign in the
 * usual text colour.
 */
const RecordedReturn: FC<RecordedReturnProps> = ({
  balances,
  monthlyContribution,
  assumedAnnualReturn,
  heading = RECORDED_RETURN_HEADING,
  id,
  headingLevel = "h3",
}) => {
  const { formatCurrency } = useFormatCurrency();
  const result = useMemo(
    () => estimateRecordedReturn({ balances, monthlyContribution }),
    [balances, monthlyContribution],
  );
  const Heading = headingLevel;
  const headingId = `${id}-heading`;
  const hasAssumption =
    typeof assumedAnnualReturn === "number" && Number.isFinite(assumedAnnualReturn);

  return (
    <section aria-labelledby={headingId} className={recordedReturnRoot()} data-testid={id} id={id}>
      <Heading className={recordedReturnHeading()} id={headingId}>
        {heading}
      </Heading>
      {result.status === "not-enough-history" ? (
        <p className={recordedReturnNote()}>
          {`Not enough history yet: this needs at least ${MIN_RECORDED_RETURN_MONTHS} months of balances in a row.`}
        </p>
      ) : (
        <>
          <dl className={recordedReturnList()}>
            {result.years.map((y) => (
              <div className={recordedReturnRow()} key={y.year}>
                <dt className={recordedReturnTerm()}>{yearLabel(y.year, y.months)}</dt>
                <dd className={recordedReturnFigure()}>{formatReturn(y.return)}</dd>
              </div>
            ))}
            <div className={recordedReturnRow({ emphasis: true })}>
              <dt className={recordedReturnTerm()}>
                {overallLabel(result.overall.months, result.overall.annualised)}
              </dt>
              <dd className={recordedReturnFigure()}>{formatReturn(result.overall.return)}</dd>
            </div>
          </dl>
          <p className={recordedReturnNote()}>
            {result.monthlyContribution > 0
              ? `Assumes ${formatCurrency(result.monthlyContribution, { maximumFractionDigits: 0 })} paid in each month, your monthly contribution.`
              : "Assumes nothing paid in, as no monthly contribution is set."}
          </p>
        </>
      )}
      {hasAssumption ? (
        <dl className={recordedReturnList()}>
          <div className={recordedReturnRow()}>
            <dt className={recordedReturnTerm()}>Your estimated annual return</dt>
            <dd className={recordedReturnFigure()}>{formatTypedRate(assumedAnnualReturn)}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
};

export default RecordedReturn;
