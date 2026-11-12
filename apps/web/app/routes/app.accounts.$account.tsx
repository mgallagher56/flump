import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { actionErrorResponse, throwRouteError } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const accountId = encodeURIComponent(args.params.account ?? "");
  if (!accessToken) throwRouteError(new BackendError("unauthorised", `/accounts/${accountId}`));

  try {
    const account = await backendFetch<any>(`/accounts/${accountId}`, {
      accessToken,
      signal: args.request.signal,
    });
    if (!account) throw new BackendError("not-found", `/accounts/${accountId}`);
    const accountDetails = account.details || [];
    return data({ account, accountDetails, user });
  } catch (error) {
    throwRouteError(error);
  }
};

const AccountDetailComponent = (): ReactElement<ReactElement> => {
  return <AccountDetailContainer />;
};

export default AccountDetailComponent;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
