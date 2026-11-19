import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, Navigate, useLoaderData } from "react-router";
import TaxSourceContainer from "~/containers/tax/TaxSourceContainer";
import { isSourcePageSource } from "~/features/tax/source-pages";
import { SOURCE_LABEL } from "~/features/tax/tax-labels";
import { taxAction } from "~/features/tax/taxActions.server";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { revalidateOnConflict } from "~/services/conflict";
import { throwRouteError } from "~/services/route-error.server";
import { isPageEnabled } from "~/utils/pageConfig";

/*
 * One income source's page (`/app/self-assessment/:source`). The trailing underscore keeps it
 * out of the list page's route, which renders no Outlet, so it is a page of its own.
 */

/** The same action as the list page, so this page's fetchers post to their own route. */
export const action = taxAction;

export const meta: MetaFunction = ({ params }) => {
  const label = isSourcePageSource(params.source) ? SOURCE_LABEL[params.source] : null;
  return [{ title: label ? `${label} | Self Assessment | Flump` : "Self Assessment | Flump" }];
};

// A save refused with 412 reloads the saved data, so the form shows and sends the latest version.
export const shouldRevalidate = revalidateOnConflict;

export const loader = async (args: LoaderFunctionArgs) => {
  const source = args.params.source;
  if (!isSourcePageSource(source)) {
    throwRouteError(new BackendError("not-found", "/tax-records"));
  }
  const { taxRecords, userProfile, accounts, user } = await loadWorkspaceSnapshot(args, {
    includeTax: true,
  });
  // Self Assessment is opt-in: someone who has not turned it on is sent to the list page's offer.
  // The page does the sending, so the loader never throws on that path (no-browser-token
  // ratchet), and it sends the records and profile only to someone who has turned it on.
  const optedIn =
    !user || isPageEnabled((userProfile?.enabledPages ?? null) as string[] | null, "tax");
  return data({
    source,
    records: optedIn ? taxRecords : [],
    userProfile: optedIn ? userProfile : null,
    // Each rental property's share and the calculated interest figures (slice 7).
    accounts: optedIn ? accounts : [],
    user,
    optedIn,
  });
};

const TaxSourceRoute = (): ReactElement => {
  const { optedIn } = useLoaderData<typeof loader>();
  return optedIn ? <TaxSourceContainer /> : <Navigate replace to="/app/self-assessment" />;
};

export default TaxSourceRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
