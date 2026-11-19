import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import MortgageContainer from "~/containers/mortgage/MortgageContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const meta: MetaFunction = () => [{ title: "Mortgage | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  // Tax records give each rental property's rent, entered once in Self Assessment (L22).
  const { accounts, accountDetails, userProfile, user, taxRecords } = await loadWorkspaceSnapshot(
    args,
    { includeTax: true },
  );
  return data({ accounts, accountDetails, userProfile, user, taxRecords });
};

const MortgageRoute = (): ReactElement => {
  return <MortgageContainer />;
};

export default MortgageRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
