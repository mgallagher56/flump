import { AcceptTermsResponse, TermsStatusResponse } from "@flump/api-contract";
import type { ReactElement } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "react-router";
import { data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import {
  type TermsAcceptanceError,
  TermsAcceptanceScreen,
} from "~/features/legal/components/TermsAcceptanceScreen";
import { safeNext } from "~/features/legal/terms";
import { FOCUSED_SHELL_HANDLE } from "~/features/onboarding/focusedShell";
import { backendFetch } from "~/services/backend-client.server";
import { ACCOUNT_ERASED_PATH, BackendError, isAccountErased } from "~/services/backend-error";
import { throwRouteError } from "~/services/route-error.server";
import { getAuthSession, requireAccessToken } from "~/utils/auth.server";
import { getMarketingUrl } from "~/utils/marketingUrl";

// Terms acceptance: the page the terms gate sends a signed-in person to when the backend answers
// 403 `terms_not_accepted` (first visit after sign-up and the invite, and after a version change),
// and the page a coming change links to. The app navigation would lead only back here, so the
// shell is focused: no header nav, bottom bar or footer.
export const handle = FOCUSED_SHELL_HANDLE;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export const loader = async (args: LoaderFunctionArgs) => {
  const token = requireAccessToken(await getAuthSession(args, { ensureSignedIn: true }));
  const next = safeNext(new URL(args.request.url).searchParams.get("next"));
  let status: TermsStatusResponse;
  try {
    status = await backendFetch("/user-profile/terms-acceptance", {
      accessToken: token,
      schema: TermsStatusResponse,
      signal: args.request.signal,
    });
  } catch (error) {
    if (isAccountErased(error)) throw redirect(ACCOUNT_ERASED_PATH);
    throwRouteError(error);
  }
  // Nothing to show: the newest versions are already recorded.
  if (status.agreed) throw redirect(next, { headers: NO_STORE });
  return data(
    { status, next, marketingUrl: getMarketingUrl(args.request.url) },
    { headers: NO_STORE },
  );
};

export const action = async (args: ActionFunctionArgs) => {
  const token = requireAccessToken(await getAuthSession(args, { ensureSignedIn: true }));
  const form = await args.request.formData();
  const next = safeNext(form.get("next"));
  const failed = (error: TermsAcceptanceError, status: number) =>
    data({ error }, { status, headers: NO_STORE });
  try {
    await backendFetch("/user-profile/terms-acceptance", {
      accessToken: token,
      method: "POST",
      schema: AcceptTermsResponse,
      body: {
        termsVersion: String(form.get("termsVersion") ?? ""),
        privacyNoticeVersion: String(form.get("privacyNoticeVersion") ?? ""),
      },
      signal: args.request.signal,
    });
  } catch (error) {
    if (isAccountErased(error)) throw redirect(ACCOUNT_ERASED_PATH);
    // The versions shown are no longer the newest: the loader reloads the new ones.
    if (error instanceof BackendError && error.status === 409) return failed("changed", 409);
    if (error instanceof BackendError) return failed("failed", 502);
    throw error;
  }
  throw redirect(next, { headers: NO_STORE });
};

export const meta: MetaFunction = () => [
  { title: "Terms of use | Flump" },
  { name: "robots", content: "noindex" },
];

const TermsAcceptanceRoute = (): ReactElement => {
  const { status, next, marketingUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  return (
    <TermsAcceptanceScreen
      status={status}
      marketingOrigin={marketingUrl}
      next={next}
      error={actionData?.error ?? null}
      submitting={navigation.state !== "idle" && navigation.formMethod === "POST"}
    />
  );
};

export default TermsAcceptanceRoute;
