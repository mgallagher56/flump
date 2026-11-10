import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import AccountsContainer from "~/containers/accounts/accountsContainer/AccountsContainer";
import { loadWorkspaceSnapshot } from "~/services/backend-client.server";
import { getAuthSession } from "~/utils/utils";

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
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

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    if (intent === "create") {
      const res = await fetch(`${apiUrl}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
        body: JSON.stringify({ name, type, ...(balance !== undefined ? { balance } : {}) }),
      });
      if (!res.ok) throw new Error("Failed to create account");
    } else if (intent === "update") {
      const res = await fetch(`${apiUrl}/accounts/${accountId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
        body: JSON.stringify({ name, type, ...(balance !== undefined ? { balance } : {}) }),
      });
      if (!res.ok) throw new Error("Failed to update account");
    } else if (intent === "delete") {
      const res = await fetch(`${apiUrl}/accounts/${accountId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete account");
    } else if (intent === "syncConnection") {
      const res = await fetch(`${apiUrl}/bank-connections/${connectionId}/refresh`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
      });
      if (!res.ok) throw new Error("Failed to sync bank connection");
    } else if (intent === "disconnectConnection") {
      const res = await fetch(`${apiUrl}/bank-connections/${connectionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
      });
      if (!res.ok) throw new Error("Failed to disconnect bank connection");
    } else if (intent === "connectBank") {
      const institutionId = formData.get("institutionId");
      const token = formData.get("token");
      const res = await fetch(`${apiUrl}/bank-connections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
        body: JSON.stringify({
          institutionId,
          token: token ? String(token) : undefined,
        }),
      });

      let backendData: any = null;
      const text = await res.text();
      try {
        backendData = JSON.parse(text);
      } catch {
        backendData = { message: text };
      }

      if (!res.ok) {
        throw new Error(backendData.message || "Failed to connect bank");
      }
      return data(backendData);
    }
    return data({ success: true });
  } catch (error) {
    console.error("Action error in accounts route:", error);
    return data({ success: false, error: (error as Error).message }, { status: 400 });
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
