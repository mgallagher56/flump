import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import BudgetContainer from "~/containers/budget/BudgetContainer";
import { loadWorkspacePicture } from "~/services/backend-client.server";

export const meta: MetaFunction = () => [{ title: "Budget | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, budgetEntries, userProfile, user, picture } =
    await loadWorkspacePicture(args);

  return data({ accounts, accountDetails, budgetEntries, userProfile, user, picture });
};

const BudgetRoute = (): ReactElement => {
  return <BudgetContainer />;
};

export default BudgetRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
