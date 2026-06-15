import type { ReactElement } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data } from "react-router";
import MortgageContainer from "~/containers/mortgage/MortgageContainer";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, {
    ensureSignedIn: true,
  });

  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";
  const headers = { Authorization: `Bearer ${accessToken || "mock-session-token"}` };

  try {
    const [accountsRes, detailsRes, profileRes] = await Promise.all([
      fetch(`${apiUrl}/accounts`, { headers }),
      fetch(`${apiUrl}/account-details`, { headers }),
      fetch(`${apiUrl}/user-profile`, { headers }),
    ]);

    if (!accountsRes.ok || !detailsRes.ok) {
      throw new Error("Failed to fetch mortgage loader data");
    }

    const [accounts, accountDetails, userProfile] = await Promise.all([
      accountsRes.json(),
      detailsRes.json(),
      profileRes.ok ? profileRes.json() : null,
    ]);

    return data({ accounts, accountDetails, userProfile, user });
  } catch (error) {
    console.error("Mortgage route loader error:", error);
    return data({
      accounts: [],
      accountDetails: [],
      userProfile: null,
      user,
    });
  }
};

const MortgageRoute = (): ReactElement => {
  return <MortgageContainer />;
};

export default MortgageRoute;
