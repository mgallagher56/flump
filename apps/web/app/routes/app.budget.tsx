import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import BudgetContainer from "~/containers/budget/BudgetContainer";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken || "mock-session-token"}` };

  try {
    const [accountsRes, detailsRes, budgetRes, profileRes] = await Promise.all([
      fetch(`${apiUrl}/accounts`, { headers }),
      fetch(`${apiUrl}/account-details`, { headers }),
      fetch(`${apiUrl}/budget-entries`, { headers }),
      fetch(`${apiUrl}/user-profile`, { headers }),
    ]);

    const [accounts, accountDetails, budgetEntries, userProfile] = await Promise.all([
      accountsRes.ok ? accountsRes.json() : [],
      detailsRes.ok ? detailsRes.json() : [],
      budgetRes.ok ? budgetRes.json() : [],
      profileRes.ok ? profileRes.json() : null,
    ]);

    return data({ accounts, accountDetails, budgetEntries, userProfile, user });
  } catch (error) {
    console.error("Budget route loader error:", error);
    return data({ accounts: [], accountDetails: [], budgetEntries: [], userProfile: null, user });
  }
};

const BudgetRoute = (): ReactElement => {
  return <BudgetContainer />;
};

export default BudgetRoute;
