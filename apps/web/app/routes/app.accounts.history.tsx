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
import { toMonthly } from "~/types/budget";
import { calculateRunwayStats } from "~/utils/runwayStorage";

export const meta: MetaFunction = () => [{ title: "Net worth history | Flump" }];

/**
 * Net worth history and the monthly check-in (E30 PR2). Saved data only. The check-in saves from
 * the browser through the same-origin `/api` proxy (`PUT /snapshots/:month`), then revalidates.
 */
export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, budgetEntries } = await loadWorkspaceSnapshot(args, {
    includeBudget: true,
  });
  const entries = Array.isArray(budgetEntries) ? budgetEntries : [];
  const income = entries.filter((e: any) => e.isIncome).reduce((s, e: any) => s + toMonthly(e), 0);
  const spending = entries
    .filter((e: any) => !e.isIncome)
    .reduce((s, e: any) => s + toMonthly(e), 0);
  const runway = calculateRunwayStats({
    entries,
    accounts,
    accountDetails,
    savedSettings: null,
  });
  return data({
    accounts,
    accountDetails,
    currentMonth: londonMonth(),
    monthlySurplus: entries.length > 0 ? Math.round((income - spending) * 100) / 100 : null,
    monthsOfCover: runway.monthlyBurn > 0 ? runway.runwayMonths : null,
  });
};

const AccountsHistory = (): ReactElement => {
  const { accounts, accountDetails, currentMonth, monthlySurplus, monthsOfCover } =
    useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const onSave = useSaveSnapshot();
  return (
    <SnapshotHistoryPage
      accountDetails={accountDetails}
      accounts={accounts}
      currentMonth={currentMonth}
      initialSheet={params.get("checkIn") === "1" ? "checkIn" : null}
      monthlySurplus={monthlySurplus}
      monthsOfCover={monthsOfCover}
      onSave={onSave}
    />
  );
};
export default AccountsHistory;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
