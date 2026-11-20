import {
  AccountListResponse,
  BetaAdminStatusResponse,
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
import { DELETE_ACCOUNT_INTENT } from "~/features/settings/account";
import { deleteAccountAction } from "~/features/settings/account.server";
import { SettingsPage } from "~/features/settings/components/SettingsPage";
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
  try {
    // The accounts only decide which net worth choices are offered. If they cannot be read the
    // page still loads and offers both (null: unknown is not "no").
    const [userProfile, netWorthChoices, isBetaAdmin] = await Promise.all([
      backendFetch("/user-profile", {
        accessToken,
        signal: args.request.signal,
        schema: UserProfileResponse,
      }) as Promise<UserProfile>,
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
    ]);
    return data({
      userProfile,
      netWorthChoices,
      isBetaAdmin,
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
  const { userProfile, user, aiGuideUrl, mcpServerUrl, netWorthChoices, isBetaAdmin } =
    useLoaderData<typeof loader>();

  return (
    <SettingsPage
      aiGuideUrl={aiGuideUrl}
      initialProfile={userProfile}
      mcpServerUrl={mcpServerUrl}
      isBetaAdmin={isBetaAdmin}
      netWorthChoices={netWorthChoices}
      user={user}
    />
  );
};

export default ProfileRoute;

export { RouteErrorBoundary as ErrorBoundary } from "~/features/feedback/components/RouteErrorBoundary";
