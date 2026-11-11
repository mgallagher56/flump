import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import { backendFetch } from "~/services/backend-client.server";
import { actionErrorResponse, throwRouteError } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = args.params.account;
  const year = formData.get("year");

  try {
    if (intent === "deleteYear") {
      await backendFetch(`/accounts/${accountId}/details/${year}`, {
        accessToken: token,
        method: "DELETE",
      });
    } else if (intent === "addYear") {
      await backendFetch(`/accounts/${accountId}/details/year`, {
        accessToken: token,
        method: "POST",
        body: { year: parseInt(year as string, 10) },
      });
    } else if (intent === "updateValues") {
      const values = JSON.parse(formData.get("values") as string);
      await backendFetch(`/accounts/${accountId}/details`, {
        accessToken: token,
        method: "PUT",
        body: { values },
      });
    }
    return data({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return data({ success: false, error: "We couldn't read those values." }, { status: 400 });
    }
    return actionErrorResponse(error);
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const accountId = args.params.account;

  try {
    const account = await backendFetch<any>(`/accounts/${accountId}`, {
      accessToken,
      signal: args.request.signal,
    });
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
