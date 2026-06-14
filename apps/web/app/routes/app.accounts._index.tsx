import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import AccountsContainer from "~/containers/accounts/accountsContainer/AccountsContainer";
import { getAuthSession } from "~/utils/utils";

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = formData.get("accountId");
  const name = formData.get("name");
  const type = formData.get("type");

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    if (intent === "create") {
      const res = await fetch(`${apiUrl}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
        body: JSON.stringify({ name, type }),
      });
      if (!res.ok) throw new Error("Failed to create account");
    } else if (intent === "update") {
      const res = await fetch(`${apiUrl}/accounts/${accountId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
        body: JSON.stringify({ name, type }),
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
    }
    return data({ success: true });
  } catch (error) {
    console.error("Action error in accounts route:", error);
    return data({ success: false, error: (error as Error).message }, { status: 500 });
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, {
    ensureSignedIn: true,
  });

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    const [accountsRes, detailsRes] = await Promise.all([
      fetch(`${apiUrl}/accounts`, {
        headers: {
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
      }),
      fetch(`${apiUrl}/account-details`, {
        headers: {
          Authorization: `Bearer ${accessToken || "mock-session-token"}`,
        },
      }),
    ]);

    if (!accountsRes.ok || !detailsRes.ok) {
      throw new Error("Failed to fetch data from API");
    }

    const accounts = await accountsRes.json();
    const accountDetails = await detailsRes.json();

    return data({ accounts, accountDetails, user });
  } catch (error) {
    console.error("API fetch error in loader:", error);
    return data({
      accounts: [],
      accountDetails: [],
      user,
    });
  }
};

const Accounts = (): ReactElement<ReactElement> => {
  return <AccountsContainer />;
};
export default Accounts;
