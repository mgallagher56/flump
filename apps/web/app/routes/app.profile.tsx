import type { ReactElement } from "react";
import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
  ShouldRevalidateFunction,
} from "react-router";
import { data, useLoaderData } from "react-router";
import { DELETE_ACCOUNT_INTENT } from "~/features/settings/account";
import { deleteAccountAction } from "~/features/settings/account.server";
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

export const action = async (args: ActionFunctionArgs) => {
  const formData = await args.request.formData();
  if (formData.get("intent") === DELETE_ACCOUNT_INTENT) return deleteAccountAction(args, formData);
  return data({ outcome: "failed" as const }, { status: 400 });
};

// After an account deletion attempt the profile may be gone: reloading it would swap the settings
// page for an error while the dialog is still reporting the outcome.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formData,
  defaultShouldRevalidate,
}) => (formData?.get("intent") === DELETE_ACCOUNT_INTENT ? false : defaultShouldRevalidate);

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
