import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import BudgetContainer from "~/containers/budget/BudgetContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, budgetEntries, userProfile, user, accessToken } =
    await loadWorkspaceSnapshot(args, { includeBudget: true });

  return data({ accounts, accountDetails, budgetEntries, userProfile, user, accessToken });
};

const BudgetRoute = (): ReactElement => {
  return <BudgetContainer />;
};

export default BudgetRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
