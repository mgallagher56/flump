import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data } from "react-router";
import SavingsContainer from "~/containers/savings/SavingsContainer";
import { getAuthSession } from "~/utils/utils";

export const meta: MetaFunction = () => [{ title: "Savings & Forecasting | Flump" }];

export const handle = {
  i18n: ["common"],
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  const accountId = formData.get("accountId");

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const authHeader = `Bearer ${accessToken || "mock-session-token"}`;

  try {
    if (intent === "createSavingsAccount") {
      const name = formData.get("name");
      const type = formData.get("type") || "Saving";
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");

      const res = await fetch(`${apiUrl}/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          name,
          type,
          balance: balance ? Number(balance) : 0,
          interestRate: interestRate !== null ? Number(interestRate) : null,
          monthlyContribution: monthlyContribution !== null ? Number(monthlyContribution) : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create savings account");
    } else if (intent === "updateSavingsAccount") {
      const name = formData.get("name");
      const type = formData.get("type");
      const balance = formData.get("balance");
      const interestRate = formData.get("interestRate");
      const monthlyContribution = formData.get("monthlyContribution");

      const updatePayload: Record<string, any> = {};
      if (name !== null && name !== undefined) updatePayload.name = name;
      if (type !== null && type !== undefined) updatePayload.type = type;
      if (balance !== null && balance !== undefined) updatePayload.balance = Number(balance);
      if (interestRate !== null && interestRate !== undefined) {
        updatePayload.interestRate = interestRate !== "" ? Number(interestRate) : null;
      }
      if (monthlyContribution !== null && monthlyContribution !== undefined) {
        updatePayload.monthlyContribution =
          monthlyContribution !== "" ? Number(monthlyContribution) : null;
      }

      const res = await fetch(`${apiUrl}/accounts/${accountId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) throw new Error("Failed to update savings account");
    } else if (intent === "deleteAccount") {
      const res = await fetch(`${apiUrl}/accounts/${accountId}`, {
        method: "DELETE",
        headers: {
          Authorization: authHeader,
        },
      });

      if (!res.ok) throw new Error("Failed to delete savings account");
    } else if (intent === "updateSavingsSettings") {
      const savingsAllocationMode = formData.get("savingsAllocationMode");
      const monthlySavingsTarget = formData.get("monthlySavingsTarget");

      const res = await fetch(`${apiUrl}/user-profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          ...(savingsAllocationMode ? { savingsAllocationMode } : {}),
          ...(monthlySavingsTarget !== null
            ? { monthlySavingsTarget: Number(monthlySavingsTarget) }
            : {}),
        }),
      });

      if (!res.ok) throw new Error("Failed to update savings settings");
    }

    return data({ success: true });
  } catch (error) {
    console.error("Action error in savings route:", error);
    return data({ success: false, error: (error as Error).message }, { status: 500 });
  }
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, {
    ensureSignedIn: true,
  });

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken || "mock-session-token"}` };

  try {
    const [accountsRes, detailsRes, profileRes, budgetRes] = await Promise.all([
      fetch(`${apiUrl}/accounts`, { headers }),
      fetch(`${apiUrl}/account-details`, { headers }),
      fetch(`${apiUrl}/user-profile`, { headers }),
      fetch(`${apiUrl}/budget-entries`, { headers }),
    ]);

    const accounts = accountsRes.ok ? await accountsRes.json() : [];
    const accountDetails = detailsRes.ok ? await detailsRes.json() : [];
    const userProfile = profileRes.ok ? await profileRes.json() : null;
    const budgetEntries = budgetRes.ok ? await budgetRes.json() : [];

    return data({ accounts, accountDetails, userProfile, budgetEntries, user });
  } catch (error) {
    console.error("Savings route loader error:", error);
    return data({
      accounts: [],
      accountDetails: [],
      userProfile: null,
      budgetEntries: [],
      user,
    });
  }
};

const SavingsRoute = (): ReactElement => {
  return <SavingsContainer />;
};

export default SavingsRoute;
