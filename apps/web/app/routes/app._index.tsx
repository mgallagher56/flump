import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import DashboardContainer from "~/containers/dashboard/DashboardContainer";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, {
    ensureSignedIn: true,
  });

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken || "mock-session-token"}` };

  try {
    const [accountsRes, detailsRes, transactionsRes, profileRes, budgetRes] = await Promise.all([
      fetch(`${apiUrl}/accounts`, { headers }),
      fetch(`${apiUrl}/account-details`, { headers }),
      fetch(`${apiUrl}/transactions`, { headers }),
      fetch(`${apiUrl}/user-profile`, { headers }),
      fetch(`${apiUrl}/budget-entries`, { headers }),
    ]);

    if (!accountsRes.ok || !detailsRes.ok || !transactionsRes.ok) {
      throw new Error("Failed to fetch dashboard data from API");
    }

    const [accounts, accountDetails, transactions, userProfile, budgetEntries] = await Promise.all([
      accountsRes.json(),
      detailsRes.json(),
      transactionsRes.json(),
      profileRes.ok ? profileRes.json() : null,
      budgetRes.ok ? budgetRes.json() : [],
    ]);

    return data({
      accounts,
      accountDetails,
      transactions,
      userProfile,
      budgetEntryCount: budgetEntries.length,
      user,
    });
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return data({
      accounts: [],
      accountDetails: [],
      transactions: [],
      userProfile: null,
      budgetEntryCount: 0,
      user,
    });
  }
};

const DashboardRoute = (): ReactElement => {
  return <DashboardContainer />;
};

export default DashboardRoute;
