import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import DebtContainer from "~/containers/debt/DebtContainer";
import { getAuthSession } from "~/utils/utils";

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
      fetch(`${apiUrl}/budget`, { headers }).catch(() => null),
    ]);

    const accounts = accountsRes.ok ? await accountsRes.json() : [];
    const accountDetails = detailsRes.ok ? await detailsRes.json() : [];
    const userProfile = profileRes.ok ? await profileRes.json() : null;
    const budgetData = budgetRes?.ok ? await budgetRes.json() : null;

    return data({ accounts, accountDetails, userProfile, budgetData, user });
  } catch (error) {
    console.error("Debt route loader error:", error);
    return data({
      accounts: [],
      accountDetails: [],
      userProfile: null,
      budgetData: null,
      user,
    });
  }
};

const DebtRoute = (): ReactElement => {
  return <DebtContainer />;
};

export default DebtRoute;
