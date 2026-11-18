import {
  type NetWorthBasis,
  type NetWorthLeftOut,
  type RecordedMonthComparison,
  resolveNetWorthScope,
  selectRecordedMonthComparison,
} from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  EmptyState,
  HeroFigure,
  PageBody,
  PageHeader,
  PageSection,
} from "@repo/ui";
import { ChartLine } from "lucide-react";
import { type FC, type MouseEvent, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  HOME_VALUE_MISSING_TEXT,
  leftOutSentence,
} from "~/features/accounts/components/NetWorthBasisLine";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  type AccountDetailInput,
  buildSnapshotHistory,
  changeSinceSentence,
  formatMonth,
  type MonthKey,
  nextCheckInDate,
  type SnapshotAccountInput,
  toChartPoints,
} from "../../snapshotModel";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { type CheckInMode, CheckInSheet, firstShownElement } from "../CheckInSheet";
import { MonthlyChangeTable } from "../MonthlyChangeTable";
import { CHECK_IN_ROUTE } from "../MonthlyCheckInCard";
import { MIN_CHART_MONTHS, NetWorthHistoryChart } from "../NetWorthHistoryChart";
import { changesBody, flushLink, heroPromptLink, sectionStack } from "./SnapshotHistoryPage.styles";

/** Opened from "?checkIn=1", the check-in returns focus to the page's "Start monthly check-in". */
const RETURN_FOCUS_TO = firstShownElement(["snapshot-open-check-in"]);

export interface SnapshotHistoryPageProps {
  accounts: readonly SnapshotAccountInput[];
  accountDetails: readonly AccountDetailInput[];
  /** The current Europe/London month. */
  currentMonth: MonthKey;
  onSave: SaveSnapshot;
  /** The user's net worth choices (saved on their profile): every month is computed under them. */
  basis: NetWorthBasis;
  /** Opens the check-in on arrival (the dashboard's "Monthly check-in" link). */
  initialSheet?: CheckInMode | null;
}

const MONTH_WORDS = ["no months", "one month", "two months"] as const;

/** "You have one month of history. The chart appears after your third check-in." (P10.6) */
export const fewMonthsPrompt = (recordedMonths: number): string =>
  `You have ${MONTH_WORDS[recordedMonths] ?? `${recordedMonths} months`} of history. The chart appears after your third check-in.`;

/**
 * The months the hero compares (owner ruling 4): "September to October 2026", or "December 2025 to
 * January 2026" across a year. Both are recorded months; carried months between them are skipped.
 */
export const comparedMonthsText = (comparison: RecordedMonthComparison): string => {
  const { previousMonth: from, month: to } = comparison;
  return from.year === to.year
    ? `${from.name} to ${to.name} ${to.year}`
    : `${from.name} ${from.year} to ${to.name} ${to.year}`;
};

/** The hero's quiet prompt while the current month has no check-in: "November not recorded yet". */
export const notRecordedPrompt = (currentMonthName: string): string =>
  `${currentMonthName} not recorded yet`;

/**
 * What net worth leaves out, as one sentence for the hero's subline, so no line sits between the
 * hero and the chart: NetWorthBasisLine's wording without its link ("Change what counts" stays on
 * the Accounts page). A missing home value takes the place of the leave-out sentence, as there.
 */
export const basisSentence = (leftOut: readonly NetWorthLeftOut[]): string =>
  leftOut.includes("homeValueMissing") ? HOME_VALUE_MISSING_TEXT : leftOutSentence(leftOut);

/**
 * Joins sentences with one space, skipping empty ones. A part followed by another gets a full stop
 * when it has none ("Up £100 since July 2026" then "Months with no check-in show as a dashed line.").
 */
export const sentences = (...parts: readonly string[]): string => {
  const kept = parts.filter(Boolean);
  return kept
    .map((p, i) => (i < kept.length - 1 && !(p.endsWith(".") || p.endsWith("?")) ? `${p}.` : p))
    .join(" ");
};

/**
 * The chart summary (P10.1, at most 2 figures): the takeaway, the change from the first point to
 * the last ("Up £15,000 since May 2026."), worded the same up or down. When this month has no
 * check-in, one clause says the dashed end is its saved balances; earlier months with no check-in
 * are named once. The end figure is the chart's direct label.
 */
export const chartSummary = (
  series: readonly { month: MonthKey; netWorth: number; allCarried: boolean }[],
  currentMonth: MonthKey,
  format: (value: number) => string,
): string => {
  const takeaway = changeSinceSentence(
    series.map((p) => ({ month: p.month, value: p.netWorth })),
    format,
  );
  const end = series.at(-1);
  const endCarried = end?.month === currentMonth && end.allCarried;
  const earlierCarried = series.slice(0, endCarried ? -1 : undefined).some((p) => p.allCarried);
  return sentences(
    takeaway,
    earlierCarried ? "Months with no check-in show as a dashed line." : "",
    endCarried ? "The dashed end is this month's saved balances, not yet recorded." : "",
  );
};

/**
 * Net worth history (E30, E16 PR 5). Saved data only: every figure comes from recorded monthly
 * balances, and the only writes are the check-in and back-fill saves. First view (P13): the h1, the
 * change since the previous recorded month as the hero, then the chart with its summary and the end
 * point labelled with net worth. With fewer than 3 recorded months there is no chart (P10.6): the
 * summary, one prompt and the check-in button show instead.
 */
export const SnapshotHistoryPage: FC<SnapshotHistoryPageProps> = ({
  accounts,
  accountDetails,
  currentMonth,
  onSave,
  basis,
  initialSheet = null,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [sheet, setSheet] = useState<CheckInMode | null>(initialSheet);
  const history = useMemo(
    () => buildSnapshotHistory(accounts, accountDetails, currentMonth, basis),
    [accounts, accountDetails, currentMonth, basis],
  );
  // History is recomputed under today's choices, scoped by today's accounts (net worth choices).
  const basisText = useMemo(
    () => basisSentence(resolveNetWorthScope(accounts, basis).leftOut),
    [accounts, basis],
  );
  const hasAccounts = accounts.length > 0;
  const { stage, series, recordedMonths } = history;
  const latest = history.latestRecorded;
  const previous = history.previousRecorded;
  // The hero compares the last two recorded months only (owner ruling 4): a carried month is
  // never one side of the change. The engine picks the months; this page only words them.
  const {
    comparison,
    currentMonthRecorded,
    currentMonth: current,
  } = useMemo(() => selectRecordedMonthComparison(series, currentMonth), [series, currentMonth]);
  const enoughForChart = recordedMonths >= MIN_CHART_MONTHS;
  // The next check-in date shows only once this month is recorded; before that the hero says this
  // month is not recorded yet, and a December date beside it would contradict it.
  const thisMonthRecorded = currentMonthRecorded;
  // A real link before hydration (#701: "?checkIn=1" opens the check-in on arrival); once
  // hydrated it opens the sheet in place, as "Start monthly check-in" does.
  const openCheckIn = (e: MouseEvent) => {
    // A modified click (new tab or window) follows the link as usual.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setSheet("checkIn");
  };
  // The hero's one quiet notice: neutral, in the hero's own ink, never a warning.
  const heroSubline = comparison ? (
    <>
      {comparedMonthsText(comparison)}.
      {currentMonthRecorded ? null : (
        <>
          {" "}
          <Link
            className={heroPromptLink()}
            data-testid="snapshot-hero-check-in"
            id="snapshot-hero-check-in"
            onClick={openCheckIn}
            to={CHECK_IN_ROUTE}
          >
            {notRecordedPrompt(current.name)}
          </Link>
          .
        </>
      )}
      {basisText ? ` ${basisText}` : null}
    </>
  ) : null;

  const checkInButton = (
    <Button
      disabled={!hasAccounts}
      id="snapshot-open-check-in"
      data-testid="snapshot-open-check-in"
      onClick={() => setSheet("checkIn")}
      type="button"
    >
      Start monthly check-in
    </Button>
  );

  // One primary button on the page (P7.4): in the header once the chart shows, otherwise beside the
  // "chart appears after your third check-in" prompt. At 375 the header holds this one action only.
  const headerActions = stage !== "none" && enoughForChart ? checkInButton : undefined;

  // At most 2 figures (P10.1). The end point's net worth is the chart's direct label.
  const summary = enoughForChart
    ? chartSummary(series, currentMonth, (v) => formatCurrency(v, { maximumFractionDigits: 0 }))
    : latest
      ? `Net worth recorded for ${formatMonth(latest.month)}: ${formatCurrency(latest.netWorth)}.`
      : "";

  // The change by account sits behind one quiet drawer. The month-by-month view is the chart's
  // "Show data" table, so it is not repeated here.
  const changes =
    latest && previous && history.accountChanges.length > 0 ? (
      <MonthlyChangeTable
        month={latest.month}
        previousMonth={previous.month}
        rows={history.accountChanges}
      />
    ) : null;

  return (
    <PageBody data-testid="snapshot-history" id="snapshot-history">
      <PageHeader
        actions={headerActions}
        description="Your net worth, recorded once a month."
        title="Net worth history"
      />

      {stage === "none" ? (
        <EmptyState
          action={
            hasAccounts ? (
              <Button id="snapshot-open-check-in" onClick={() => setSheet("checkIn")} type="button">
                Start monthly check-in
              </Button>
            ) : (
              <Button asChild>
                <Link to="/app/accounts">Add an account</Link>
              </Button>
            )
          }
          description={
            hasAccounts
              ? "Record this month's balances to start your history. You can add earlier months too."
              : "Add your accounts first. Their balances then become your first month of history."
          }
          id="snapshot-empty"
          secondaryAction={
            hasAccounts ? (
              <Button onClick={() => setSheet("backfill")} type="button" variant="secondary">
                Add earlier months
              </Button>
            ) : undefined
          }
          title="No monthly balances yet"
        />
      ) : (
        <>
          {comparison ? (
            <HeroFigure
              label="Net worth change"
              subline={heroSubline}
              value={comparison.netWorthChange}
              valueFormat={{ fractionDigits: 0, signDisplay: "always" }}
            />
          ) : (
            <HeroFigure
              emptyPrompt={sentences(
                "The change shows once you have two months recorded.",
                basisText,
              )}
              label="Monthly change"
              notSetLabel="No earlier month"
            />
          )}

          <PageSection
            className={sectionStack()}
            description="Your net worth each month, from your recorded balances."
            icon={ChartLine}
            id="snapshot-chart"
            title="Net worth over time"
            tone="neutral"
          >
            <NetWorthHistoryChart
              dataActions={
                <>
                  {/* Before the chart shows, the one primary button leads the row (P7.4). */}
                  {enoughForChart ? null : checkInButton}
                  <Button
                    className={flushLink()}
                    data-testid="snapshot-open-backfill"
                    disabled={!hasAccounts}
                    id="snapshot-open-backfill"
                    onClick={() => setSheet("backfill")}
                    size="sm"
                    type="button"
                    variant="link"
                  >
                    Add earlier months
                  </Button>
                </>
              }
              dataNote={
                thisMonthRecorded ? `Next check-in: ${nextCheckInDate(currentMonth)}` : undefined
              }
              notEnoughDataText={fewMonthsPrompt(recordedMonths)}
              points={toChartPoints(series)}
              recordedMonths={recordedMonths}
              summary={summary}
            />
          </PageSection>

          {changes ? (
            <CollapsibleDrawer
              className={changesBody()}
              title="Show changes by account"
              variant="quiet"
            >
              {changes}
            </CollapsibleDrawer>
          ) : null}
        </>
      )}

      {sheet ? (
        <CheckInSheet
          accountDetails={accountDetails}
          accounts={accounts}
          basis={basis}
          currentMonth={currentMonth}
          key={sheet}
          mode={sheet}
          onOpenChange={(open) => {
            if (!open) setSheet(null);
          }}
          onSave={onSave}
          open
          returnFocusTo={RETURN_FOCUS_TO}
        />
      ) : null}
    </PageBody>
  );
};

export default SnapshotHistoryPage;
