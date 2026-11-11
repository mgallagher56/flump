import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import AccountDetailContainer from "~/containers/accounts/accountDetailContainer/AccountDetailContainer";
import { authHeader, getAuthSession } from "~/utils/auth.server";

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const authz = authHeader({ accessToken });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = args.params.account;
  const year = formData.get("year");

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    if (intent === "deleteYear") {
      const res = await fetch(`${apiUrl}/accounts/${accountId}/details/${year}`, {
        method: "DELETE",
        headers: {
          ...authz,
        },
      });
      if (!res.ok) throw new Error("Failed to delete year");
    } else if (intent === "addYear") {
      const res = await fetch(`${apiUrl}/accounts/${accountId}/details/year`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authz,
        },
        body: JSON.stringify({ year: parseInt(year as string, 10) }),
      });
      if (!res.ok) throw new Error("Failed to add year");
    } else if (intent === "updateValues") {
      const values = JSON.parse(formData.get("values") as string);
      const res = await fetch(`${apiUrl}/accounts/${accountId}/details`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authz,
        },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) throw new Error("Failed to update values");
    }
    return data({ success: true });
  } catch (error) {
    console.error("Action error in account detail route:", error);
    return data({ success: false, error: (error as Error).message }, { status: 500 });
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, {
    ensureSignedIn: true,
  });
  const authz = authHeader({ accessToken });

  const accountId = args.params.account;
  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    const accountRes = await fetch(`${apiUrl}/accounts/${accountId}`, {
      headers: {
        ...authz,
      },
    });

    if (!accountRes.ok) {
      throw new Error("Failed to fetch data from API");
    }

    const account = await accountRes.json();
    const accountDetails = account.details || [];

    return data({ account, accountDetails, user });
  } catch (error) {
    console.error("API fetch error in loader:", error);
    return data({
      account: null,
      accountDetails: [],
      user,
    });
  }
};

const AccountDetailComponent = (): ReactElement<ReactElement> => {
  return <AccountDetailContainer />;
};

export default AccountDetailComponent;
