import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import TakeHomeContainer from "~/containers/takeHome/TakeHomeContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";

export const meta: MetaFunction = () => [{ title: "Take-home pay | Flump" }];

export const handle = {
  i18n: ["common"],
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { userProfile, user } = await loadWorkspaceSnapshot(args);
  return data({ userProfile, user });
};

const TakeHomeRoute = (): ReactElement => {
  return <TakeHomeContainer />;
};

export default TakeHomeRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
