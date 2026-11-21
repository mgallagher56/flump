import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import MortgageEstimatesContainer from "~/containers/mortgage/MortgageEstimatesContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const meta: MetaFunction = () => [{ title: "Mortgage estimates | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, budgetEntries, userProfile, user } =
    await loadWorkspaceSnapshot(args, { includeBudget: true });
  return data({ accounts, accountDetails, budgetEntries, userProfile, user });
};

const MortgageEstimatesRoute = (): ReactElement => {
  return <MortgageEstimatesContainer />;
};

export default MortgageEstimatesRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
