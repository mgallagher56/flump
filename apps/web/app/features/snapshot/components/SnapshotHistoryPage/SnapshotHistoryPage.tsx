import { Button, EmptyState, HeroFigure, PageBody, PageHeader } from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link } from "react-router";
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
import { actionsRow, checkInLine, promptActions, sectionStack } from "./SnapshotHistoryPage.styles";

export interface SnapshotHistoryPageProps {
  accounts: readonly SnapshotAccountInput[];
  accountDetails: readonly AccountDetailInput[];
  /** The current Europe/London month. */
  currentMonth: MonthKey;
  onSave: SaveSnapshot;
  /** Opens the check-in on arrival (the dashboard's "Monthly check-in" link). */
  initialSheet?: CheckInMode | null;
}

const MONTH_WORDS = ["no months", "one month", "two months"] as const;

/** "You have one month of history. The chart appears after your third check-in." (P10.6) */
export const fewMonthsPrompt = (recordedMonths: number): string =>
  `You have ${MONTH_WORDS[recordedMonths] ?? `${recordedMonths} months`} of history. The chart appears after your third check-in.`;

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
  initialSheet = null,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [sheet, setSheet] = useState<CheckInMode | null>(initialSheet);
  const history = useMemo(
    () => buildSnapshotHistory(accounts, accountDetails, currentMonth),
    [accounts, accountDetails, currentMonth],
  );
  const hasAccounts = accounts.length > 0;
  const { stage, series, recordedMonths } = history;
  // Compare recorded months only: a current month with no check-in yet is carried, not a change.
  const latest = history.latestRecorded;
  const previous = history.previousRecorded;
  const latestChange = latest && previous ? latest.netWorth - previous.netWorth : null;
  const enoughForChart = recordedMonths >= MIN_CHART_MONTHS;
  const first = series[0];
  const end = series.at(-1);

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
  // "chart appears after your third check-in" prompt.
  const headerActions =
    stage === "none" ? undefined : (
      <div className={actionsRow()}>
        <Button
          disabled={!hasAccounts}
          id="snapshot-open-backfill"
          data-testid="snapshot-open-backfill"
          onClick={() => setSheet("backfill")}
          type="button"
          variant="secondary"
        >
          Add earlier months
        </Button>
        {enoughForChart ? checkInButton : null}
      </div>
    );

  // At most 2 figures (P10.1). The end point's net worth is also the chart's direct label.
  const summary =
    enoughForChart && first && end
      ? `Net worth each month since ${formatMonth(first.month)}, ending at ${formatCurrency(end.netWorth)}.`
      : latest
        ? `Net worth recorded for ${formatMonth(latest.month)}: ${formatCurrency(latest.netWorth)}.`
        : "";

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
          {latestChange !== null && previous ? (
            <HeroFigure
              label="Change since last month"
              subline={`Since ${formatMonth(previous.month)}`}
              value={latestChange}
              valueFormat={{ fractionDigits: 0, signDisplay: "always" }}
            />
          ) : (
            <HeroFigure
              emptyPrompt="The change shows once you have two months recorded."
              label="Change since last month"
              notSetLabel="No earlier month"
            />
          )}

          <section className={sectionStack()}>
            <NetWorthHistoryChart
              notEnoughDataText={fewMonthsPrompt(recordedMonths)}
              points={toChartPoints(series)}
              recordedMonths={recordedMonths}
              summary={summary}
            />
            {enoughForChart ? null : <div className={promptActions()}>{checkInButton}</div>}
            <p className={checkInLine()}>Next check-in: {nextCheckInDate(currentMonth)}</p>
          </section>

          {latest && previous && (history.accountChanges.length > 0 || enoughForChart) ? (
            // Each table carries its own heading ("Change by account", "Change by month").
            <div className={sectionStack()}>
              {history.accountChanges.length > 0 ? (
                <MonthlyChangeTable
                  month={latest.month}
                  previousMonth={previous.month}
                  rows={history.accountChanges}
                  variant="accounts"
                />
              ) : null}
              {enoughForChart ? (
                <MonthlyChangeTable rows={history.monthChanges} variant="months" />
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {sheet ? (
        <CheckInSheet
          accountDetails={accountDetails}
          accounts={accounts}
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
