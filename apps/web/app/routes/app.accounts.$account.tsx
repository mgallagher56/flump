import { AccountResponse, UserProfileResponse } from "@flump/api-contract";
import { netWorthBasisFromProfile } from "@flump/finance-engine";
import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const accountId = encodeURIComponent(args.params.account ?? "");
  if (!accessToken) throwRouteError(new BackendError("unauthorised", `/accounts/${accountId}`));

  try {
    const [account, userProfile] = await Promise.all([
      backendFetch(`/accounts/${accountId}`, {
        accessToken,
        signal: args.request.signal,
        schema: AccountResponse,
      }),
      // The net worth choices only: without them the defaults apply, so a failure here never
      // blocks the account page.
      backendFetch("/user-profile", {
        accessToken,
        signal: args.request.signal,
        schema: UserProfileResponse,
      }).catch(() => null),
    ]);
    if (!account) throw new BackendError("not-found", `/accounts/${accountId}`);
    const accountDetails = account.details || [];
    // Whether this account counts toward net worth follows the user's choices (net worth choices).
    const basis = netWorthBasisFromProfile(userProfile);
    return data({ account, accountDetails, basis, user });
  } catch (error) {
    throwRouteError(error);
  }
};

const AccountDetailComponent = (): ReactElement<ReactElement> => {
  return <AccountDetailContainer />;
};

export default AccountDetailComponent;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
