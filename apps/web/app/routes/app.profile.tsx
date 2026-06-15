import type { ReactElement } from "react";
import { useEffect } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { data, useLoaderData } from "react-router";
import UserProfilePanel from "~/components/budget/UserProfilePanel";
import type { UserProfile } from "~/hooks/useUserProfile";
import { DEFAULT_PROFILE, useUserProfile } from "~/hooks/useUserProfile";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const apiUrl = process.env.VITE_API_URL || "http://localhost:4000";

  try {
    const res = await fetch(`${apiUrl}/user-profile`, {
      headers: { Authorization: `Bearer ${accessToken || "mock-session-token"}` },
    });
    const userProfile: UserProfile = res.ok ? await res.json() : DEFAULT_PROFILE;
    return data({ userProfile, user });
  } catch (error) {
    console.error("Profile route loader error:", error);
    return data({ userProfile: DEFAULT_PROFILE, user });
  }
};

const ProfileRoute = (): ReactElement => {
  const { userProfile } = useLoaderData<typeof loader>();
  const { setProfile } = useUserProfile();

  // Seed the Jotai atom so other features get the current profile
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  return <UserProfilePanel initialProfile={userProfile} />;
};

export default ProfileRoute;
