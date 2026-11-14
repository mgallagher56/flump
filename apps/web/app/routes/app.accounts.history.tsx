import { netWorthBasisFromProfile } from "@flump/finance-engine";
import type { ReactElement } from "react";
import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useSearchParams,
} from "react-router";
import { SnapshotHistoryPage } from "~/features/snapshot/components/SnapshotHistoryPage";
import { londonMonth } from "~/features/snapshot/snapshotModel";
import { useSaveSnapshot } from "~/features/snapshot/useSaveSnapshot";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const meta: MetaFunction = () => [{ title: "Net worth history | Flump" }];

/**
 * Net worth history and the monthly check-in (E30 PR2). Saved data only. The check-in saves from
 * the browser through the same-origin `/api` proxy (`PUT /snapshots/:month`), then revalidates.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  // Recorded balances only (E16 PR 5): months of cover moved to Budget and the single-month
  // projection went with the chart rule (P10.6), so the budget is no longer loaded here.
  const { accounts, accountDetails, userProfile } = await loadWorkspaceSnapshot(args);
  // Every month is computed under the user's net worth choices, as on every other page.
  const basis = netWorthBasisFromProfile(userProfile);
  return data({ accounts, accountDetails, basis, currentMonth: londonMonth() });
};

const AccountsHistory = (): ReactElement => {
  const { accounts, accountDetails, basis, currentMonth } = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const onSave = useSaveSnapshot();
  return (
    <SnapshotHistoryPage
      accountDetails={accountDetails}
      accounts={accounts}
      basis={basis}
      currentMonth={currentMonth}
      initialSheet={params.get("checkIn") === "1" ? "checkIn" : null}
      onSave={onSave}
    />
  );
};
export default AccountsHistory;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
