import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from "react-router";
import { OnboardingFlow } from "~/features/onboarding/components/OnboardingFlow";
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

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/user-profile"));
  try {
    const userProfile = await backendFetch<UserProfile>("/user-profile", {
      accessToken,
      signal: args.request.signal,
    });
    // The access token stays on the server: browser calls go through the same-origin /api proxy.
    return data({ userProfile, user });
  } catch (error) {
    throwRouteError(error);
  }
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
  const actionError =
    actionData && "success" in actionData && actionData.success === false ? actionData.error : null;
  return <OnboardingFlow actionError={actionError} />;
}

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
