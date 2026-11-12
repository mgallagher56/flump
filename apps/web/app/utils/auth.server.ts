import { authkitLoader } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { safeErrorSummary } from "~/utils/safeErrorSummary";

/** The only place a dev session token literal lives. Server-only. */
export const DEV_ACCESS_TOKEN = "mock-session-token";
export const DEV_SESSION_USER = { id: "dev_user_123", email: "dev@flump.com" };

/**
 * Mirrors the backend: bypass only when AUTH_DEV_BYPASS=true AND NODE_ENV=development.
 * Throws if the flag is set in production; any other NODE_ENV ignores the flag (fail closed).
 */
export function isDevBypass(env: Record<string, string | undefined>): boolean {
  if (env.AUTH_DEV_BYPASS !== "true") return false;
  if (env.NODE_ENV === "production") {
    throw new Error("AUTH_DEV_BYPASS must not be enabled in production");
  }
  return env.NODE_ENV === "development";
}

export const MAX_SESSION_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 14;
export const PRODUCTION_SESSION_COOKIE_NAME = "__Host-wos-session";

/**
 * Session lifetime policy (E20-N19). Mutates `env` so authkit, which reads WORKOS_COOKIE_MAX_AGE
 * and WORKOS_COOKIE_NAME from it at request time, sees the policy values.
 * - Max-Age defaults to 14 days (authkit's own default is 400 days). Production fails boot above
 *   14 days; an unparseable value would silently become 400 days in authkit, so it is rejected too.
 * - Production requires an https WORKOS_REDIRECT_URI (authkit sets Secure from it).
 * - Production defaults the cookie name to `__Host-wos-session` (needs Secure, Path=/ and no Domain,
 *   all of which authkit applies once the redirect URI is https). Dev and test keep `wos-session`
 *   because `__Host-` cookies are rejected over plain http.
 */
export function applySessionPolicy(env: Record<string, string | undefined>): void {
  const production = env.NODE_ENV === "production";

  const rawMaxAge = env.WORKOS_COOKIE_MAX_AGE?.trim();
  if (!rawMaxAge) {
    env.WORKOS_COOKIE_MAX_AGE = String(MAX_SESSION_COOKIE_AGE_SECONDS);
  } else if (production) {
    const maxAge = /^\d+$/.test(rawMaxAge) ? Number.parseInt(rawMaxAge, 10) : Number.NaN;
    if (!Number.isFinite(maxAge) || maxAge <= 0 || maxAge > MAX_SESSION_COOKIE_AGE_SECONDS) {
      throw new Error(
        `WORKOS_COOKIE_MAX_AGE must be a positive number of seconds no greater than ${MAX_SESSION_COOKIE_AGE_SECONDS} (14 days) in production`,
      );
    }
  }

  if (production) {
    let redirectProtocol: string | undefined;
    try {
      redirectProtocol = new URL(env.WORKOS_REDIRECT_URI ?? "").protocol;
    } catch {
      redirectProtocol = undefined;
    }
    if (redirectProtocol !== "https:") {
      throw new Error("WORKOS_REDIRECT_URI must be an https URL in production");
    }
    if (!env.WORKOS_COOKIE_NAME?.trim()) {
      env.WORKOS_COOKIE_NAME = PRODUCTION_SESSION_COOKIE_NAME;
    }
  }
}

// Fail at server start (this module is loaded by root.tsx and every loader), not on first auth failure.
isDevBypass(process.env);
applySessionPolicy(process.env);

export function requireAccessToken(session: { accessToken: string | null }): string {
  if (!session.accessToken) {
    throw redirect("/login");
  }
  return session.accessToken;
}

export function authHeader(session: { accessToken: string | null }): { Authorization: string } {
  return { Authorization: `Bearer ${requireAccessToken(session)}` };
}

export async function getAuthSession(
  args: LoaderFunctionArgs | ActionFunctionArgs,
  options: { ensureSignedIn: boolean } = { ensureSignedIn: true },
) {
  try {
    const response = await authkitLoader(
      args,
      async ({ getAccessToken }) => {
        return { accessToken: getAccessToken() };
      },
      { ensureSignedIn: options.ensureSignedIn },
    );

    let data: any;
    if (response && typeof response === "object" && "data" in response) {
      data = (response as any).data;
    } else if (typeof (response as any)?.json === "function") {
      data = await (response as any).json();
    } else {
      data = response;
    }

    return {
      user: data?.user || null,
      accessToken: (data?.accessToken as string) || null,
      headers: (response as any)?.init?.headers || (response as any)?.headers,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    if (error && typeof error === "object" && ("status" in error || "headers" in error)) {
      throw error;
    }
    if (isDevBypass(process.env)) {
      console.warn("authkitLoader failed, using dev bypass session:", safeErrorSummary(error));
      return { user: DEV_SESSION_USER, accessToken: DEV_ACCESS_TOKEN };
    }
    throw error;
  }
}
