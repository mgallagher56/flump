import { Button, EmptyState, Illustration } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { authLoader, configure } from "@workos-inc/authkit-react-router";
import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";
import {
  legacySessionCookieClear,
  MAX_SESSION_COOKIE_AGE_SECONDS,
} from "~/utils/sessionPolicy.server";
import { APP_VERSION, feedbackMailto } from "~/utils/support";

const callbackRoot = css({
  maxWidth: "560px",
  marginX: "auto",
  paddingX: "16px",
  paddingY: { base: "24px", md: "64px" },
});

const callbackReport = css({
  fontSize: "sm",
  color: "primary",
  textDecoration: "underline",
  textUnderlineOffset: "2px",
  _focusVisible: { outline: "2px solid", outlineColor: "border.focusRing", outlineOffset: "2px" },
});

const workosLoader = authLoader({
  returnPathname: "/app",
});

export const loader = async (args: LoaderFunctionArgs) => {
  const request = args.request;
  const url = new URL(request.url);
  if (!url.searchParams.get("code")) {
    return redirect("/login");
  }

  if (
    process.env.NODE_ENV === "development" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  ) {
    configure((key: string) => {
      if (key === "WORKOS_REDIRECT_URI") {
        return `${url.origin}/callback`;
      }
      return process.env[key];
    });
  }

  const response = await workosLoader(args);
  const behindHttpsProxy =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() === "https";
  const secure = url.protocol === "https:" || behindHttpsProxy ? "; Secure" : "";
  const sessionPresenceCookie = `flump_has_session=1; Path=/; SameSite=Lax; Max-Age=${MAX_SESSION_COOKIE_AGE_SECONDS}${secure}`;

  if (response instanceof Response) {
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", sessionPresenceCookie);
    const legacyClear = legacySessionCookieClear(process.env);
    if (legacyClear) headers.append("Set-Cookie", legacyClear);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
};

/**
 * Sign-in failure. The provider's own message is never shown: it can carry codes and internals,
 * so the page says what happened in plain words and offers a way to start again.
 */
export default function CallbackRoute() {
  const data = useLoaderData<typeof loader>() as { error?: unknown } | null;
  if (!data?.error) return null;
  return (
    <div className={callbackRoot}>
      <EmptyState
        action={
          <Button asChild variant="primary">
            <a href="/login">Try signing in again</a>
          </Button>
        }
        // The error replaces the whole page, so its heading is the page's h1.
        headingLevel="h1"
        description="Something went wrong while signing you in, so we haven't started a session. Try signing in again. If it keeps happening, report it and we'll look into it."
        id="callback-error"
        illustration={<Illustration scene="empty-accounts" size="sm" />}
        secondaryAction={
          <a className={callbackReport} href={feedbackMailto("/callback", APP_VERSION)}>
            Report this problem
          </a>
        }
        title="We couldn't sign you in"
      />
    </div>
  );
}
