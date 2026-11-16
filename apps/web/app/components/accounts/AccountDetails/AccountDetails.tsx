import { computeInvestmentReturns } from "@flump/finance-engine";
import {
  Card,
  CollapsibleDrawer,
  EmptyState,
  Illustration,
  KpiCard,
  KpiStrip,
  Money,
  PageSection,
  Table,
  TBody,
  Td,
  THead,
  Th,
  Tr,
} from "@repo/ui";
import { History, TrendingUp } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useMemo } from "react";
import { useLoaderData } from "react-router";
import AccountDetailChart, { type AccountChartRow } from "~/components/charts/AccountDetailChart";
import { toDisplayBalance } from "~/containers/accounts/utils";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import type { loader } from "~/routes/app.accounts.$account";
import { isFutureMonth } from "~/utils/accounts";
import { detailsRoot, returnNote, returnNumeric } from "./AccountDetails.styles";

/** How a month's figure was given, when it was not typed: shown wherever the figure appears. */
export const sourceLabel = (source: unknown): string | null =>
  source === "calculated" ? "Calculated" : source === "confirmed" ? "Confirmed" : null;

/**
 * The chart's months: recorded months up to now, oldest first, ending on the figure the hero shows.
 * With this month not recorded yet, the saved balance (D22) is this month's point, marked carried
 * so the last segment is dashed, as on the net worth history chart.
 */
export const accountChartRows = (
  details: readonly { month?: unknown; year?: unknown; value?: unknown; source?: unknown }[],
  accountType: string | undefined,
  savedBalance: unknown,
  currentMonth: string,
): AccountChartRow[] => {
  const past = details
    .map((d) => ({
      month: Number(d.month),
      year: Number(d.year),
      value: toDisplayBalance(accountType, Number(d.value)),
      source: d.source,
    }))
    .filter((d) => !isFutureMonth(d.month, d.year))
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  const [cy, cm] = currentMonth.split("-").map(Number) as [number, number];
  const hasCurrent = past.some((d) => d.year === cy && d.month === cm);
  if (hasCurrent || savedBalance === undefined || savedBalance === null || past.length === 0) {
    return past;
  }
  return [
    ...past,
    {
      month: cm,
      year: cy,
      value: toDisplayBalance(accountType, Number(savedBalance)),
      carried: true,
    },
  ];
};

/** The section around the history (E17 5A): a header with an icon tile, a title and one line. */
const HistorySection: FC<{ children: ReactNode }> = ({ children }) => (
  <PageSection
    description="This account's balance each month, as recorded."
    domain="net-worth"
    icon={History}
    id="account-balance-history"
    title="Balance history"
  >
    {children}
  </PageSection>
);

const formatReturnPct = (pct: number): string => `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% / yr`;

const MAX_INLINE_YEAR_ROWS = 8;

/**
 * Balance history: one chart drawn like net worth history, with every month and how it was given
 * ("Calculated", "Confirmed") in its "Show data" table. For Investment accounts, also shows
 * estimated annual return (for projections) and actual average return from monthly check-ins.
 */
const AccountDetails: FC = () => {
  const { accountDetails = [], account } = useLoaderData<typeof loader>();
  const isInvestment = account?.type === "Investment";

  const rows = useMemo(
    () =>
      accountChartRows(
        accountDetails as never[],
        account?.type ?? undefined,
        account?.balance,
        londonMonth(),
      ),
    [accountDetails, account?.type, account?.balance],
  );

  const investmentReturns = useMemo(() => {
    if (!isInvestment) return null;
    const points = rows.map((r) => ({ year: r.year, month: r.month, value: r.value }));
    return computeInvestmentReturns(points, Number(account?.monthlyContribution) || 0);
  }, [isInvestment, rows, account?.monthlyContribution]);

  const estimatedReturn =
    isInvestment &&
    account?.interestRate !== null &&
    account?.interestRate !== undefined &&
    Number.isFinite(Number(account.interestRate))
      ? Number(account.interestRate)
      : null;

  const renderYearlyTable = (yearly: NonNullable<typeof investmentReturns>["yearlyReturns"]) => (
    <Table>
      <THead>
        <Tr>
          <Th>Year</Th>
          <Th align="end">Start balance</Th>
          <Th align="end">End balance</Th>
          <Th align="end">Actual return</Th>
        </Tr>
      </THead>
      <TBody>
        {yearly.map((y) => (
          <Tr key={y.year}>
            <Td className={returnNumeric()}>{y.year}</Td>
            <Td align="end">
              <Money size="sm" value={y.startValue} />
            </Td>
            <Td align="end">
              <Money size="sm" value={y.endValue} />
            </Td>
            <Td align="end" className={returnNumeric()}>
              {formatReturnPct(y.annualReturnPct)}
            </Td>
          </Tr>
        ))}
      </TBody>
    </Table>
  );

  const investmentSection = isInvestment ? (
    <PageSection
      description="Actual returns are worked out from your monthly check-ins. Estimated return is used for projections only."
      domain="savings"
      icon={TrendingUp}
      id="investment-returns"
      title="Investment returns"
    >
      <div className={detailsRoot()}>
        <KpiStrip columns={2}>
          <KpiCard
            label="Actual average return"
            subtext={
              investmentReturns && investmentReturns.spanMonths > 0
                ? `Across ${investmentReturns.spanMonths} ${investmentReturns.spanMonths === 1 ? "month" : "months"} of check-ins`
                : "Needs at least 2 monthly check-ins"
            }
            value={
              investmentReturns?.overallAnnualReturnPct !== null &&
              investmentReturns?.overallAnnualReturnPct !== undefined ? (
                <span className={returnNumeric()}>
                  {formatReturnPct(investmentReturns.overallAnnualReturnPct)}
                </span>
              ) : null
            }
          />
          <KpiCard
            label="Estimated annual return"
            subtext="Projection assumption, not a fixed AER"
            value={
              estimatedReturn !== null ? (
                <span className={returnNumeric()}>{`${estimatedReturn.toFixed(1)}% / yr`}</span>
              ) : null
            }
          />
        </KpiStrip>
        {investmentReturns && investmentReturns.yearlyReturns.length > 0 ? (
          investmentReturns.yearlyReturns.length > MAX_INLINE_YEAR_ROWS ? (
            <CollapsibleDrawer
              closedLabel="Show year-by-year returns"
              openLabel="Hide year-by-year returns"
              title={`Year-by-year returns (${investmentReturns.yearlyReturns.length} years)`}
              variant="quiet"
            >
              {renderYearlyTable(investmentReturns.yearlyReturns)}
            </CollapsibleDrawer>
          ) : (
            <Card padding="none">{renderYearlyTable(investmentReturns.yearlyReturns)}</Card>
          )
        ) : (
          <p className={returnNote()}>
            Record at least two monthly check-ins to see year-by-year actual returns.
          </p>
        )}
      </div>
    </PageSection>
  ) : null;

  if (!accountDetails || accountDetails.length === 0) {
    return (
      <>
        {investmentSection}
        <HistorySection>
          <Card padding="none">
            <EmptyState
              description="Record this account's balance each month and its history shows here."
              headingLevel="h3"
              illustration={<Illustration scene="onboarding" />}
              title="No balance history yet"
            />
          </Card>
        </HistorySection>
      </>
    );
  }

  return (
    <>
      {investmentSection}
      <HistorySection>
        <div className={detailsRoot()}>
          <AccountDetailChart
            accountDetails={rows}
            title={`${account?.name ?? "Account"} balance history`}
          />
        </div>
      </HistorySection>
    </>
  );
};

export default AccountDetails;
