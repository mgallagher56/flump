import {
  estimateRecordedReturn,
  INVESTMENT_RISK_NOTICE,
  MAX_PLAUSIBLE_MONTHLY_RETURN,
  MIN_RECORDED_RETURN_MONTHS,
  type RecordedBalance,
  type RecordedReturnResult,
} from "@flump/finance-engine";
import { type FC, useMemo } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { isFutureMonth } from "~/utils/accounts";
import {
  recordedReturnAssumption,
  recordedReturnFigure,
  recordedReturnHeading,
  recordedReturnList,
  recordedReturnNote,
  recordedReturnRoot,
  recordedReturnRow,
  recordedReturnTerm,
  recordedReturnWrap,
} from "./RecordedReturn.styles";

interface RecordedReturnProps {
  /** Recorded monthly balances (any order). Leave out any month that is not recorded yet. */
  balances: readonly RecordedBalance[];
  /** The account's monthly contribution setting, assumed paid in every month. */
  monthlyContribution?: number | null;
  /**
   * The user's own "Estimated annual return" (5 means 5%). When set it shows as its own line
   * below the recorded block, outside it, never in a row beside the recorded figures.
   */
  assumedAnnualReturn?: number | null;
  /** Heading text; defaults to `RECORDED_RETURN_HEADING`. */
  heading?: string;
  /** Unique per page: used for the heading id. */
  id: string;
  headingLevel?: "h2" | "h3" | "h4";
}

/**
 * The recorded months of an investment account for its estimated return: months up to now only,
 * never the carried saved balance (the estimate uses balances the person recorded). A "No change"
 * month (`source` "confirmed") repeats the last balance rather than recording one, so it is left
 * out: counted, it would read as a month of 0% growth. The estimate skips the gap it leaves.
 */
export const recordedReturnBalances = (
  details: readonly { month?: unknown; year?: unknown; value?: unknown; source?: unknown }[],
): { year: number; month: number; value: number }[] =>
  details
    .filter((d) => d.source !== "confirmed")
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

const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "March 2026" for year 2026, month 3. */
const monthYearLabel = (m: { year: number; month: number }): string =>
  monthYear.format(new Date(Date.UTC(m.year, m.month - 1, 1)));

const UNRELIABLE_LEAD = "Not enough reliable history.";

/** Why the recorded balances give no figure, in plain words: a fact and what to check. */
const unreliableReason = (
  result: Extract<RecordedReturnResult, { status: "unreliable" }>,
  formatMoney: (n: number) => string,
): string => {
  if (result.reason === "contribution-not-reflected") {
    return `The balances recorded do not show the ${formatMoney(result.monthlyContribution)} paid in each month. Check the monthly contribution on this account.`;
  }
  const bound = Math.round(MAX_PLAUSIBLE_MONTHLY_RETURN * 100);
  const span = result.month
    ? ` between ${monthYearLabel(result.month.from)} and ${monthYearLabel(result.month.to)}`
    : "";
  return `The balance changes by more than ${bound}% in one month${span}. Check the balances recorded for those months.`;
};

export const overallLabel = (months: number, annualised: boolean): string =>
  annualised ? "Overall, a year on average" : `Overall, over ${months} months`;

/**
 * The return an investment account made, estimated from its recorded monthly balances (owner item
 * 10b): one figure per calendar year and one overall, worked out by `estimateRecordedReturn` in
 * the finance engine. A past figure, never a prediction, in its own labelled block with its own
 * notes and the standard investment line. The user's own assumed return, when set, is a separate
 * line outside that block, never in the same row or list, so the two are not compared by placement.
 * A fall shows with a minus sign in the usual text colour. Records that cannot give a reliable
 * figure (a contribution the balances do not show, or a month beyond the plausible bound) say why.
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

  const formatMoney = (n: number) => formatCurrency(n, { maximumFractionDigits: 0 });

  return (
    <div className={recordedReturnWrap()}>
      <section
        aria-labelledby={headingId}
        className={recordedReturnRoot()}
        data-testid={id}
        id={id}
      >
        <Heading className={recordedReturnHeading()} id={headingId}>
          {heading}
        </Heading>
        {result.status === "not-enough-history" ? (
          <p className={recordedReturnNote()}>
            {`Not enough history yet: this needs at least ${MIN_RECORDED_RETURN_MONTHS} months of balances in a row.`}
          </p>
        ) : result.status === "unreliable" ? (
          <p className={recordedReturnNote()}>
            {`${UNRELIABLE_LEAD} ${unreliableReason(result, formatMoney)}`}
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
                ? `Assumes ${formatMoney(result.monthlyContribution)} paid in each month, your monthly contribution.`
                : "Assumes nothing paid in, as no monthly contribution is set."}
            </p>
            <p className={recordedReturnNote()}>{INVESTMENT_RISK_NOTICE}</p>
          </>
        )}
      </section>
      {hasAssumption ? (
        <p className={recordedReturnAssumption()}>
          {`The estimated annual return you set for this account is ${formatTypedRate(assumedAnnualReturn)}.`}
        </p>
      ) : null}
    </div>
  );
};

export default RecordedReturn;
