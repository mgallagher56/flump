import { ImportBatchListResponse } from "@flump/api-contract";
import type { ReactElement } from "react";
import { data, type LoaderFunctionArgs, type MetaFunction, useLoaderData } from "react-router";
import { ImportsListPage } from "~/features/imports/components/ImportsListPage";
import type { ImportBatch } from "~/features/imports/importModel";
import { backendFetchAll } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Imports | Flump" }];

/** The user's staged, saved, undone and expired imports (E17 re-plan PR E). */
export const loader = async (args: LoaderFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/imports"));
  try {
    const batches: ImportBatch[] = await backendFetchAll("/imports", {
      accessToken,
      signal: args.request.signal,
      schema: ImportBatchListResponse,
    });
    return data({ batches });
  } catch (error) {
    throwRouteError(error);
  }
};

const Imports = (): ReactElement => {
  const { batches } = useLoaderData<typeof loader>();
  return <ImportsListPage batches={batches} />;
};
export default Imports;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
