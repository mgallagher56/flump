import type { ReactElement } from "react";
import { useEffect } from "react";
import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, useLoaderData } from "react-router";
import { SettingsPage } from "~/features/settings/components/SettingsPage";
import type { UserProfile } from "~/hooks/useUserProfile";
import { useUserProfile } from "~/hooks/useUserProfile";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Settings | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/user-profile"));
  try {
    const userProfile = await backendFetch<UserProfile>("/user-profile", {
      accessToken,
      signal: args.request.signal,
    });
    return data({ userProfile, user });
  } catch (error) {
    throwRouteError(error);
  }
};

const ProfileRoute = (): ReactElement => {
  const { userProfile, user } = useLoaderData<typeof loader>();
  const { setProfile } = useUserProfile();

  // Seed the Jotai atom so other features get the current profile
  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  return <SettingsPage initialProfile={userProfile} user={user} />;
};

export default ProfileRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
