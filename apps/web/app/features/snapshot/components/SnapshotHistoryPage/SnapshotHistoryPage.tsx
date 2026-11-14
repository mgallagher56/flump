import { type NetWorthBasis, resolveNetWorthScope } from "@flump/finance-engine";
import {
  Button,
  CollapsibleDrawer,
  EmptyState,
  HeroFigure,
  PageBody,
  PageHeader,
  Tabs,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link } from "react-router";
import { NetWorthBasisLine } from "~/features/accounts/components/NetWorthBasisLine";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import {
  type AccountDetailInput,
  buildSnapshotHistory,
  formatMonth,
  type MonthKey,
  nextCheckInDate,
  type SnapshotAccountInput,
  toChartPoints,
} from "../../snapshotModel";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { type CheckInMode, CheckInSheet } from "../CheckInSheet";
import { MonthlyChangeTable } from "../MonthlyChangeTable";
import { MIN_CHART_MONTHS, NetWorthHistoryChart } from "../NetWorthHistoryChart";
import {
  changesBody,
  checkInLine,
  checkInRow,
  promptActions,
  sectionStack,
} from "./SnapshotHistoryPage.styles";

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
 * "Against September 2026", plus "This month is not recorded yet." when the current month has no
 * check-in, so the hero never reads as this month's change. One line with one date, so the first
 * view stays inside the number budget (P1).
 */
export const heroSubline = (
  previous: { month: MonthKey },
  end: { month: MonthKey; allCarried: boolean } | undefined,
  currentMonth: MonthKey,
): string => {
  const against = `Against ${formatMonth(previous.month)}`;
  return end?.month === currentMonth && end.allCarried
    ? `${against}. This month is not recorded yet.`
    : against;
};

/**
 * The chart summary (P10.1, at most 2 figures). The end figure is the chart's direct label, so the
 * summary names the first month and, only when a month has no check-in, says which line is dashed
 * instead of a legend.
 */
export const chartSummary = (
  series: readonly { month: MonthKey; allCarried: boolean }[],
  currentMonth: MonthKey,
): string => {
  const first = series[0];
  if (!first) return "";
  const opening = `Net worth each month since ${formatMonth(first.month)}.`;
  const carried = series.filter((p) => p.allCarried);
  // Only the current month carried: the hero subline already says it is not recorded, so the
  // summary adds no second notice (P4).
  const onlyCurrent = carried.length === 1 && carried[0]?.month === currentMonth;
  if (carried.length === 0 || onlyCurrent) return opening;
  return `${opening} Months with no check-in show as a dashed line.`;
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
  const leftOut = useMemo(() => resolveNetWorthScope(accounts, basis).leftOut, [accounts, basis]);
  const hasAccounts = accounts.length > 0;
  const { stage, series, recordedMonths } = history;
  // Compare recorded months only: a current month with no check-in yet is carried, not a change.
  const latest = history.latestRecorded;
  const previous = history.previousRecorded;
  const latestChange = latest && previous ? latest.netWorth - previous.netWorth : null;
  const enoughForChart = recordedMonths >= MIN_CHART_MONTHS;
  const end = series.at(-1);
  const [changesTab, setChangesTab] = useState<"accounts" | "months">("accounts");

  const checkInButton = (
    <Button
      disabled={!hasAccounts}
      id="snapshot-open-check-in"
      data-testid="snapshot-open-check-in"
      onClick={() => setSheet("checkIn")}
      type="button"
    >
      Update balances
    </Button>
  );

  // One primary button on the page (P7.4): in the header once the chart shows, otherwise beside the
  // "chart appears after your third check-in" prompt. At 375 the header holds this one action only.
  const headerActions = stage !== "none" && enoughForChart ? checkInButton : undefined;

  // At most 2 figures (P10.1). The end point's net worth is the chart's direct label.
  const summary = enoughForChart
    ? chartSummary(series, currentMonth)
    : latest
      ? `Net worth recorded for ${formatMonth(latest.month)}: ${formatCurrency(latest.netWorth)}.`
      : "";

  // Both change tables sit behind one quiet drawer, as two tabs when both exist.
  const accountsTable =
    latest && previous && history.accountChanges.length > 0 ? (
      <MonthlyChangeTable
        month={latest.month}
        previousMonth={previous.month}
        rows={history.accountChanges}
        variant="accounts"
      />
    ) : null;
  const monthsTable =
    latest && previous && enoughForChart ? (
      <MonthlyChangeTable rows={history.monthChanges} variant="months" />
    ) : null;
  const changes =
    accountsTable && monthsTable ? (
      <Tabs
        aria-label="Changes"
        items={[
          { value: "accounts", label: "By account" },
          { value: "months", label: "By month" },
        ]}
        onValueChange={(value) => setChangesTab(value === "months" ? "months" : "accounts")}
        panels={{ accounts: accountsTable, months: monthsTable }}
        size="sm"
        value={changesTab}
      />
    ) : (
      (accountsTable ?? monthsTable)
    );
  const changesTitle =
    accountsTable && monthsTable
      ? "Show changes by account and by month"
      : accountsTable
        ? "Show changes by account"
        : "Show changes by month";

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
              <Button onClick={() => setSheet("checkIn")} type="button">
                Update balances
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
          {latestChange !== null && latest && previous ? (
            <HeroFigure
              label={`Change in ${formatMonth(latest.month)}`}
              subline={heroSubline(previous, end, currentMonth)}
              value={latestChange}
              valueFormat={{ fractionDigits: 0, signDisplay: "always" }}
            />
          ) : (
            <HeroFigure
              emptyPrompt="The change shows once you have two months recorded."
              label="Monthly change"
              notSetLabel="No earlier month"
            />
          )}
          <NetWorthBasisLine id="snapshot-net-worth-basis" leftOut={leftOut} />

          <section className={sectionStack()}>
            <NetWorthHistoryChart
              notEnoughDataText={fewMonthsPrompt(recordedMonths)}
              points={toChartPoints(series)}
              recordedMonths={recordedMonths}
              summary={summary}
            />
            {enoughForChart ? null : <div className={promptActions()}>{checkInButton}</div>}
            <div className={checkInRow()}>
              <p className={checkInLine()}>Next check-in: {nextCheckInDate(currentMonth)}</p>
              <Button
                disabled={!hasAccounts}
                id="snapshot-open-backfill"
                data-testid="snapshot-open-backfill"
                onClick={() => setSheet("backfill")}
                size="sm"
                type="button"
                variant="link"
              >
                Add earlier months
              </Button>
            </div>
          </section>

          {changes ? (
            <CollapsibleDrawer className={changesBody()} title={changesTitle} variant="quiet">
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
        />
      ) : null}
    </PageBody>
  );
};

export default SnapshotHistoryPage;
