import {
  describeJointWholeHistory,
  isOwedAccountType,
  selectAccountBalanceSeries,
} from "@flump/finance-engine";
import { Card, EmptyState, Illustration, PageSection } from "@repo/ui";
import { History } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useMemo } from "react";
import { useLoaderData } from "react-router";
import RecordedReturn, { recordedReturnBalances } from "~/components/accounts/RecordedReturn";
import AccountDetailChart from "~/components/charts/AccountDetailChart";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import type { loader } from "~/routes/app.accounts.$account";
import { detailsRoot } from "./AccountDetails.styles";

/** How a month's figure was given, when it was not typed: shown wherever the figure appears. */
export const sourceLabel = (source: unknown): string | null =>
  source === "calculated" ? "Calculated" : source === "confirmed" ? "Confirmed" : null;

/** The section's other words, also pinned by the mobile app's copy parity test (E12 S6). */
export const BALANCE_HISTORY_COPY = {
  title: "Balance history",
  emptyTitle: "No balance history yet",
  emptyDescription: "Record this account's balance each month and its history shows here.",
} as const;

/** The section's line for an account held alone. */
export const HISTORY_DESCRIPTION = "This account's balance each month, as recorded.";

/**
 * The section around the history (E17 5A): a header with an icon tile, a title and one line. A
 * joint account's chart is the whole account (owner decision 9 A), so its line says so with the
 * share, and the chart cannot be read against the hero, which is the share.
 */
const HistorySection: FC<{ children: ReactNode; description?: string | null }> = ({
  children,
  description,
}) => (
  <PageSection
    description={description ?? HISTORY_DESCRIPTION}
    domain="accounts"
    icon={History}
    id="account-balance-history"
    title={BALANCE_HISTORY_COPY.title}
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

  // The chart's months: recorded months up to now, oldest first, ending on the figure the hero
  // shows. With this month not recorded yet, the saved balance (D22) is this month's point, marked
  // carried so the last segment is dashed. The engine works them out (E12 S6).
  const rows = useMemo(
    () =>
      selectAccountBalanceSeries(
        { type: account?.type, balance: account?.balance },
        accountDetails as never[],
        londonMonth(),
      ),
    [accountDetails, account?.type, account?.balance],
  );
  const isInvestment = account?.type === "Investment";
  const returnBalances = useMemo(
    () => (isInvestment ? recordedReturnBalances(accountDetails as never[]) : []),
    [accountDetails, isInvestment],
  );

  const jointLine = describeJointWholeHistory(
    {
      name: account?.name,
      type: account?.type,
      accountSubtype: account?.accountSubtype,
      ownership: account?.ownership,
      sharePercent: account?.sharePercent,
    },
    isOwedAccountType(account?.type) ? "amount owed" : "balance",
  );

  if (!accountDetails || accountDetails.length === 0) {
    return (
      <HistorySection>
        <Card padding="none">
          <EmptyState
            description={BALANCE_HISTORY_COPY.emptyDescription}
            headingLevel="h3"
            illustration={<Illustration scene="onboarding" />}
            title={BALANCE_HISTORY_COPY.emptyTitle}
          />
        </Card>
      </HistorySection>
    );
  }

  return (
    <HistorySection description={jointLine}>
      <div className={detailsRoot()}>
        <AccountDetailChart
          accountDetails={rows}
          title={`${account?.name ?? "Account"} balance history`}
        />
        {isInvestment ? (
          <RecordedReturn
            assumedAnnualReturn={account?.interestRate ?? null}
            balances={returnBalances}
            id="account-recorded-return"
            monthlyContribution={account?.monthlyContribution ?? null}
          />
        ) : null}
      </div>
    </HistorySection>
  );
};

export default AccountDetails;
