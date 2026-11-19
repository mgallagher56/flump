import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import MortgageContainer from "~/containers/mortgage/MortgageContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const meta: MetaFunction = () => [{ title: "Mortgage | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, user } = await loadWorkspaceSnapshot(args);
  return data({ accounts, accountDetails, userProfile, user });
};

const MortgageRoute = (): ReactElement => {
  return <MortgageContainer />;
};

export default MortgageRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
