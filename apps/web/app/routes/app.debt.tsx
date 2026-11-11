import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import DebtContainer from "~/containers/debt/DebtContainer";
import { buildDebtInputs } from "~/features/debt/utils/debtInputs";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, budgetEntries, user } =
    await loadWorkspaceSnapshot(args, { includeBudget: true });

  return data({
    accounts,
    accountDetails,
    userProfile,
    debtInputs: buildDebtInputs(accounts, accountDetails, budgetEntries),
    user,
  });
};

const DebtRoute = (): ReactElement => {
  return <DebtContainer />;
};

export default DebtRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
