import { UpdateProfileResponse, UserProfileResponse } from "@flump/api-contract";
import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useActionData,
  useLoaderData,
} from "react-router";
import { OnboardingFlow } from "~/features/onboarding/components/OnboardingFlow";
import { FOCUSED_SHELL_HANDLE } from "~/features/onboarding/focusedShell";
import type { UserProfile } from "~/hooks/useUserProfile";
import { backendFetch } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { actionErrorResponse, throwRouteError } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import {
  type AppPageKey,
  type DashboardWidgetKey,
  DEFAULT_ENABLED_PAGES,
  stripRetiredKeys,
} from "~/utils/pageConfig";

/** Setup is a focused flow: no app navigation (UX N9). The app shell reads this. */
export const handle = FOCUSED_SHELL_HANDLE;

export const meta: MetaFunction = () => [{ title: "Set up | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/user-profile"));
  let userProfile: UserProfile;
  try {
    userProfile = await backendFetch("/user-profile", {
      schema: UserProfileResponse,
      accessToken,
      signal: args.request.signal,
    });
  } catch (error) {
    throwRouteError(error);
  }
  // Setup is done once. Someone who has finished it (an old tab, a bookmark, the back button)
  // goes to their dashboard rather than a blank setup that would save over their details.
  if (userProfile.onboardingCompleted) return redirect("/");
  // The access token stays on the server: browser calls go through the same-origin /api proxy.
  return data({ userProfile, user });
};

export const action = async (args: ActionFunctionArgs) => {
  const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  const token = requireAccessToken({ accessToken });
  const formData = await args.request.formData();
  const rawEnabledPages = formData.get("enabledPages");
  const enabledPages: AppPageKey[] = rawEnabledPages
    ? stripRetiredKeys<AppPageKey>(JSON.parse(rawEnabledPages as string))
    : DEFAULT_ENABLED_PAGES;

  const dashboardWidgets: DashboardWidgetKey[] = [...enabledPages];
  const dashboardWidgetOrder: DashboardWidgetKey[] = [...enabledPages];

  try {
    await backendFetch("/user-profile", {
      schema: UpdateProfileResponse,
      accessToken: token,
      method: "PATCH",
      body: {
        enabledPages,
        dashboardWidgets,
        dashboardWidgetOrder,
        onboardingCompleted: true,
      },
    });
  } catch (err) {
    // Redirecting home after a failed save would bounce straight back here: surface the error.
    return actionErrorResponse(err);
  }

  return redirect("/");
};

export default function OnboardingRoute() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const actionError =
    actionData && "success" in actionData && actionData.success === false ? actionData.error : null;
  return (
    <OnboardingFlow actionError={actionError} savedProfile={loaderData?.userProfile ?? null} />
  );
}

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
