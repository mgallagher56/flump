import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import MortgageContainer from "~/containers/mortgage/MortgageContainer";
import { loadWorkspacePicture } from "~/services/backend-client.server";

export const meta: MetaFunction = () => [{ title: "Mortgage | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, userProfile, user, picture } = await loadWorkspacePicture(args);
  return data({ accounts, accountDetails, userProfile, user, picture });
};

const MortgageRoute = (): ReactElement => {
  return <MortgageContainer />;
};

export default MortgageRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
