import {
  AccountListResponse,
  BetaAdminStatusResponse,
  UserEmailResponse,
  UserProfileResponse,
} from "@flump/api-contract";
import { type NetWorthChoicesAvailable, netWorthChoicesAvailable } from "@flump/finance-engine";
import type { ReactElement } from "react";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
  ShouldRevalidateFunction,
} from "react-router";
import { data, useLoaderData } from "react-router";
import { apiConfig } from "~/config.server";
import { isHouseholdIntent } from "~/features/household/household";
import { householdAction, loadHouseholdSettings } from "~/features/household/household.server";
import { DELETE_ACCOUNT_INTENT } from "~/features/settings/account";
import { deleteAccountAction } from "~/features/settings/account.server";
import { SettingsPage } from "~/features/settings/components/SettingsPage";
import { parseSettingsTab } from "~/features/settings/settings-tabs";
import type { UserProfile } from "~/hooks/useUserProfile";
import { backendFetch, backendFetchAll } from "~/services/backend-client.server";
import { BackendError } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession } from "~/utils/auth.server";
import { getMarketingUrl } from "~/utils/marketingUrl";

export const meta: MetaFunction = () => [{ title: "Settings | Flump" }];

export const loader = async (args: LoaderFunctionArgs) => {
  const { user, accessToken } = await getAuthSession(args, { ensureSignedIn: true });
  if (!accessToken) throwRouteError(new BackendError("unauthorised", "/user-profile"));
  const hasSessionEmail = typeof user?.email === "string" && user.email.trim().length > 0;
  try {
    // The accounts only decide which net worth choices are offered. If they cannot be read the
    // page still loads and offers both (null: unknown is not "no").
    const [userProfile, accountEmail, netWorthChoices, isBetaAdmin, household] = await Promise.all([
      backendFetch("/user-profile", {
        accessToken,
        signal: args.request.signal,
        schema: UserProfileResponse,
      }) as Promise<UserProfile>,
      // Resolves the sign-in email server-side from WorkOS only when the AuthKit session lacks one.
      // Any failure (including 404 from an older backend) gives null so Settings still renders.
      hasSessionEmail
        ? Promise.resolve(null)
        : backendFetch("/user-profile/email", {
            accessToken,
            signal: args.request.signal,
            schema: UserEmailResponse,
          }).then(
            (res) => res.email ?? null,
            () => null,
          ),
      backendFetchAll("/accounts", {
        accessToken,
        signal: args.request.signal,
        schema: AccountListResponse,
      }).then(
        (accounts): NetWorthChoicesAvailable | null => netWorthChoicesAvailable(accounts),
        () => null,
      ),
      // Admins (BETA_ADMIN_USER_IDS) get a link to the invites page; anyone else gets a 404.
      backendFetch("/beta/admin", {
        accessToken,
        signal: args.request.signal,
        schema: BetaAdminStatusResponse,
      }).then(
        () => true,
        () => false,
      ),
      // Households (E34 C3): the tab exists only when the backend answers. With its switch off it
      // answers 404, and any failure counts the same: null, no tab (fail closed).
      loadHouseholdSettings(accessToken, args.request.signal),
    ]);
    // Chosen here so the first HTML already shows the tab `?tab=` names; unknown names and a
    // Household tab that is not there open Profile.
    const initialTab =
      parseSettingsTab(new URL(args.request.url).search, {
        householdAvailable: household !== null,
      }) ?? "profile";
    return data({
      userProfile,
      accountEmail,
      initialTab,
      netWorthChoices,
      isBetaAdmin,
      household,
      user,
      aiGuideUrl: `${getMarketingUrl(args.request.url)}/features/ai-connection#setup`,
      mcpServerUrl: `${apiConfig.apiBaseUrl.replace(/\/$/, "")}/mcp`,
    });
  } catch (error) {
    throwRouteError(error);
  }
};

export const action = async (args: ActionFunctionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get("intent");
  if (intent === DELETE_ACCOUNT_INTENT) return deleteAccountAction(args, formData);
  if (isHouseholdIntent(intent)) {
    const { accessToken } = await getAuthSession(args, { ensureSignedIn: true });
    if (!accessToken) throwRouteError(new BackendError("unauthorised", "/household"));
    return householdAction(args.request, accessToken, intent, formData);
  }
  return data({ outcome: "failed" as const }, { status: 400 });
};

// After an account deletion attempt the profile may be gone: reloading it would swap the settings
// page for an error while the dialog is still reporting the outcome.
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formData,
  defaultShouldRevalidate,
}) => (formData?.get("intent") === DELETE_ACCOUNT_INTENT ? false : defaultShouldRevalidate);

const ProfileRoute = (): ReactElement => {
  const {
    userProfile,
    accountEmail,
    user,
    aiGuideUrl,
    mcpServerUrl,
    netWorthChoices,
    isBetaAdmin,
    household,
    initialTab,
  } = useLoaderData<typeof loader>();

  return (
    <SettingsPage
      accountEmail={accountEmail}
      aiGuideUrl={aiGuideUrl}
      initialProfile={userProfile}
      mcpServerUrl={mcpServerUrl}
      household={household}
      initialTab={initialTab}
      isBetaAdmin={isBetaAdmin}
      netWorthChoices={netWorthChoices}
      user={user}
    />
  );
};

export default ProfileRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
