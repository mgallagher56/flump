import { BankSyncOrchestrator } from "@flump/banking/server";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import AccountsContainer from "~/containers/accounts/accountsContainer/AccountsContainer";
import {
  backendFetch,
  type HttpMethod,
  loadWorkspaceSnapshot,
} from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { actionErrorResponse } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";

export function getBankOAuthUrl(institutionId: string, callbackUrl: string): string | null {
  return BankSyncOrchestrator.getOAuthUrl(institutionId, callbackUrl);
}

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = formData.get("accountId");
  const connectionId = formData.get("connectionId");
  const name = formData.get("name");
  const type = formData.get("type");
  const rawBalance = formData.get("balance");
  const balance =
    rawBalance !== null && rawBalance !== "" && Number.isFinite(Number(rawBalance))
      ? Number(rawBalance)
      : undefined;

  const send = (endpoint: string, method: HttpMethod, body?: unknown) =>
    backendFetch<any>(endpoint, { accessToken: token, method, body });

  try {
    if (intent === "create") {
      await send("/accounts", "POST", {
        name,
        type,
        ...(balance !== undefined ? { balance } : {}),
      });
    } else if (intent === "update") {
      await send(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, "PATCH", {
        name,
        type,
        ...(balance !== undefined ? { balance } : {}),
      });
    } else if (intent === "delete") {
      await send(`/accounts/${encodeURIComponent(String(accountId ?? ""))}`, "DELETE");
    } else if (intent === "syncConnection") {
      await send(
        `/bank-connections/${encodeURIComponent(String(connectionId ?? ""))}/refresh`,
        "POST",
      );
    } else if (intent === "disconnectConnection") {
      await send(`/bank-connections/${encodeURIComponent(String(connectionId ?? ""))}`, "DELETE");
    } else if (intent === "connectBank") {
      const institutionId = String(formData.get("institutionId") || "");
      const bankToken = formData.get("token");
      const authType = formData.get("authType");
      const isOAuth = authType === "oauth" || (!bankToken && authType !== "token");

      let backendData: any = null;
      try {
        backendData = await send("/bank-connections", "POST", {
          institutionId,
          token: bankToken ? String(bankToken) : undefined,
        });
      } catch (connectErr) {
        // OAuth connections may be completed through the provider redirect even if this call fails.
        if (!isOAuth || !(connectErr instanceof BackendError)) throw connectErr;
      }

      if (isOAuth) {
        if (backendData?.oauth && backendData?.redirectUrl) {
          return data({ success: true, oauth: true, redirectUrl: backendData.redirectUrl });
        }

        const origin = new URL(args.request.url).origin;
        const callbackUrl = `${origin}/auth/callback`;
        const oauthUrl = getBankOAuthUrl(institutionId, callbackUrl);

        if (oauthUrl) {
          return data({
            success: true,
            oauth: true,
            redirectUrl: oauthUrl,
          });
        }
      }

      return data(backendData || { success: true });
    }
    return data({ success: true });
  } catch (error) {
    return actionErrorResponse(error);
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { accounts, accountDetails, bankConnections, user } = await loadWorkspaceSnapshot(args, {
    includeConnections: true,
  });
  return data({ accounts, accountDetails, bankConnections, user });
};

const Accounts = (): ReactElement<ReactElement> => {
  return <AccountsContainer />;
};
export default Accounts;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
