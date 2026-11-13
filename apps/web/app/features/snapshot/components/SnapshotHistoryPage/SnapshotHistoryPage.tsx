import {
  Button,
  Card,
  EmptyState,
  KpiCard,
  KpiStrip,
  PageHeader,
  ProjectionNotice,
  StatusBadge,
} from "@repo/ui";
import { type FC, useMemo, useState } from "react";
import { Link } from "react-router";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { formatSignedChange, netWorthChangeSentence } from "../../snapshotCopy";
import {
  type AccountDetailInput,
  buildSnapshotHistory,
  formatMonth,
  historyCountLabel,
  latestRecordedMonth,
  type MonthKey,
  nextCheckInDate,
  projectFromSnapshot,
  type SnapshotAccountInput,
  toChartPoints,
} from "../../snapshotModel";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { type CheckInMode, CheckInSheet } from "../CheckInSheet";
import { MonthlyChangeTable } from "../MonthlyChangeTable";
import { NetWorthHistoryChart } from "../NetWorthHistoryChart";
import {
  actionsRow,
  changeSentence,
  factLabel,
  factList,
  factValue,
  page,
  savedLine,
  sectionHeading,
  sectionStack,
} from "./SnapshotHistoryPage.styles";

export interface SnapshotHistoryPageProps {
  accounts: readonly SnapshotAccountInput[];
  accountDetails: readonly AccountDetailInput[];
  /** The current Europe/London month. */
  currentMonth: MonthKey;
  /** Saved budget surplus a month, or null when there is no budget. Drives the single-month projection. */
  monthlySurplus: number | null;
  /** Saved cash divided by essential monthly spending (the Budget runway), or null when unknown. */
  monthsOfCover: number | null;
  onSave: SaveSnapshot;
  /** Opens the check-in on arrival (the dashboard's "Monthly check-in" link). */
  initialSheet?: CheckInMode | null;
}

const PROJECTION_MONTHS = 6;
const COVER_FORMAT = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/**
 * Net worth history (E30). Saved data only: every figure comes from recorded monthly balances,
 * and the only writes are the check-in and back-fill saves. What the page shows depends on how
 * many months are recorded: none (a prompt), one (the point, a projection, the next check-in and
 * months of cover), two (changes only) and three or more (the trend).
 */
export const SnapshotHistoryPage: FC<SnapshotHistoryPageProps> = ({
  accounts,
  accountDetails,
  currentMonth,
  monthlySurplus,
  monthsOfCover,
  onSave,
  initialSheet = null,
}) => {
  const { formatCurrency } = useFormatCurrency();
  const [sheet, setSheet] = useState<CheckInMode | null>(initialSheet);
  const history = useMemo(
    () => buildSnapshotHistory(accounts, accountDetails, currentMonth),
    [accounts, accountDetails, currentMonth],
  );
  const lastRecorded = latestRecordedMonth(accountDetails);
  const hasAccounts = accounts.length > 0;
  const { stage, series } = history;
  // Compare recorded months only: a current month with no check-in yet is carried, not a change.
  const latest = history.latestRecorded;
  const previous = history.previousRecorded;
  const latestChange = latest && previous ? latest.netWorth - previous.netWorth : null;
  const recordedPoint = latest;
  const projection =
    stage === "single" && recordedPoint
      ? projectFromSnapshot(recordedPoint, monthlySurplus, PROJECTION_MONTHS)
      : [];
  const singlePoints =
    stage === "single" && recordedPoint
      ? toChartPoints(series.filter((p) => p.month === recordedPoint.month))
      : [];

  const coverKnown = monthsOfCover !== null && Number.isFinite(monthsOfCover);
  const coverText = coverKnown
    ? `${COVER_FORMAT.format(monthsOfCover)} ${COVER_FORMAT.format(monthsOfCover) === "1" ? "month" : "months"}`
    : "Not set";

  const actions = (
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
      <Button
        disabled={!hasAccounts}
        id="snapshot-open-check-in"
        data-testid="snapshot-open-check-in"
        onClick={() => setSheet("checkIn")}
        type="button"
      >
        Update balances
      </Button>
    </div>
  );

  // Figures only: dates and counts sit in the saved-state line and the description, so the
  // strip never wraps a long text value at phone width.
  const netWorthKpi = latest ? (
    <KpiCard
      key="nw"
      label={`Net worth, ${formatMonth(latest.month)}`}
      tone="hero"
      value={latest.netWorth}
    />
  ) : null;
  const kpis =
    !latest || !netWorthKpi
      ? null
      : stage === "single" || !previous || latestChange === null
        ? ([netWorthKpi] as const)
        : ([
            netWorthKpi,
            <KpiCard
              key="change"
              label={`Change since ${formatMonth(previous.month)}`}
              value={formatSignedChange(latestChange)}
            />,
          ] as const);

  return (
    <div className={page()} id="snapshot-history" data-testid="snapshot-history">
      <PageHeader
        actions={actions}
        description={
          stage === "none"
            ? "Your monthly balances, recorded once a month."
            : historyCountLabel(history.recordedMonths)
        }
        title="Net worth history"
      />

      {lastRecorded ? (
        <p className={savedLine()}>
          <StatusBadge variant="neutral">Saved</StatusBadge>
          <span>Last recorded month: {formatMonth(lastRecorded)}</span>
          <span aria-hidden="true">·</span>
          <span>Next check-in: {nextCheckInDate(currentMonth)}</span>
        </p>
      ) : null}

      {kpis ? <KpiStrip items={kpis} /> : null}

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
      ) : null}

      {stage === "single" && recordedPoint ? (
        <section aria-labelledby="snapshot-first-heading" className={sectionStack()}>
          <h2 className={sectionHeading()} id="snapshot-first-heading">
            Your first month
          </h2>
          <NetWorthHistoryChart
            points={singlePoints}
            projection={projection}
            summary={
              projection.length > 0
                ? `Net worth recorded for ${formatMonth(recordedPoint.month)}: ${formatCurrency(recordedPoint.netWorth)}. The dashed line is a projection from your budget surplus of ${formatCurrency(monthlySurplus ?? 0)} a month.`
                : `Net worth recorded for ${formatMonth(recordedPoint.month)}: ${formatCurrency(recordedPoint.netWorth)}.`
            }
          />
          {projection.length > 0 ? (
            <ProjectionNotice>
              Projection, not a forecast: it assumes your budget surplus of{" "}
              {formatCurrency(monthlySurplus ?? 0)} a month carries on unchanged. Your next check-in
              replaces it with what actually happened.
            </ProjectionNotice>
          ) : null}
          <Card as="section" aria-label="What happens next" padding="md">
            <dl className={factList()}>
              <div>
                <dt className={factLabel()}>Next check-in</dt>
                <dd className={factValue()}>{nextCheckInDate(currentMonth)}</dd>
              </div>
              <div>
                <dt className={factLabel()}>Months of cover</dt>
                <dd className={factValue()}>
                  {coverText}
                  {coverKnown ? (
                    <span className={factLabel()}>
                      {" "}
                      (cash accounts ÷ essential spending in Budget)
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          </Card>
        </section>
      ) : null}

      {(stage === "pair" || stage === "trend") && latest && previous ? (
        <section aria-labelledby="snapshot-changes-heading" className={sectionStack()}>
          <h2 className={sectionHeading()} id="snapshot-changes-heading">
            Month-on-month changes
          </h2>
          {latestChange !== null ? (
            <p className={changeSentence()} id="snapshot-change-sentence">
              {netWorthChangeSentence(latestChange, previous.month)}
            </p>
          ) : null}
          {stage === "trend" ? (
            <NetWorthHistoryChart
              points={toChartPoints(series)}
              summary={`Net worth over ${series.length} months, from ${formatCurrency(series[0]?.netWorth ?? 0)} in ${formatMonth(series[0]?.month ?? latest.month)} to ${formatCurrency(latest.netWorth)} in ${formatMonth(latest.month)}.`}
            />
          ) : null}
          {history.accountChanges.length > 0 ? (
            <MonthlyChangeTable
              month={latest.month}
              previousMonth={previous.month}
              rows={history.accountChanges}
              variant="accounts"
            />
          ) : null}
          {stage === "trend" ? (
            <MonthlyChangeTable rows={history.monthChanges} variant="months" />
          ) : null}
        </section>
      ) : null}

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
    </div>
  );
};

export default SnapshotHistoryPage;
