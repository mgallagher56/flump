import type { ReactElement } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import TaxContainer from "~/containers/tax/TaxContainer";
import { londonDate } from "~/features/snapshot/snapshotModel";
import { mtdNoticePosition } from "~/features/tax/mtdNotice";
import { taxAction } from "~/features/tax/taxActions.server";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { revalidateOnConflict } from "~/services/conflict";

/** Shared with each income source's page (`app.self-assessment_.$source`). */
export const action = taxAction;

export const meta: MetaFunction = () => [{ title: "Self Assessment | Flump" }];

// A save refused with 412 reloads the saved data, so the form shows and sends the latest version.
export const shouldRevalidate = revalidateOnConflict;

export const loader = async (args: LoaderFunctionArgs) => {
  const { taxRecords, userProfile, accounts, user } = await loadWorkspaceSnapshot(args, {
    includeTax: true,
  });
  // Making Tax Digital notice (E28): worked out here, on the Europe/London date, so server and
  // browser agree.
  const mtdPosition = mtdNoticePosition({
    records: taxRecords,
    employmentType: userProfile?.employmentType ?? null,
    accounts,
    today: londonDate(),
  });
  return data({ records: taxRecords, userProfile, accounts, user, mtdPosition });
};

const TaxRoute = (): ReactElement => {
  return <TaxContainer />;
};

export default TaxRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
