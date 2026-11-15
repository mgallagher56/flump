import { Card, EmptyState, Illustration, PageSection } from "@repo/ui";
import { History } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useMemo } from "react";
import { useLoaderData } from "react-router";
import AccountDetailChart, { type AccountChartRow } from "~/components/charts/AccountDetailChart";
import { toDisplayBalance } from "~/containers/accounts/utils";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import type { loader } from "~/routes/app.accounts.$account";
import { isFutureMonth } from "~/utils/accounts";
import { detailsRoot } from "./AccountDetails.styles";

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

/**
 * Balance history: one chart drawn like net worth history, with every month and how it was given
 * ("Calculated", "Confirmed") in its "Show data" table. No tabs and no year table.
 */
const AccountDetails: FC = () => {
  const { accountDetails = [], account } = useLoaderData<typeof loader>();

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

  if (!accountDetails || accountDetails.length === 0) {
    return (
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
    );
  }

  return (
    <HistorySection>
      <div className={detailsRoot()}>
        <AccountDetailChart
          accountDetails={rows}
          title={`${account?.name ?? "Account"} balance history`}
        />
      </div>
    </HistorySection>
  );
};

export default AccountDetails;
