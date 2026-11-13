import { authkitLoader } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { recordRefreshedCookies } from "~/security/session-cookies.server";
import { safeErrorSummary } from "~/utils/safeErrorSummary";
import { applySessionPolicy } from "~/utils/sessionPolicy.server";

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

export {
  applySessionPolicy,
  MAX_SESSION_COOKIE_AGE_SECONDS,
  PRODUCTION_SESSION_COOKIE_NAME,
} from "~/utils/sessionPolicy.server";

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

type AuthSession = { user: any; accessToken: string | null; headers: unknown };

/**
 * Single-flight per request (E20-N2). Root and child loaders run in parallel and each calls
 * `getAuthSession`; authkit does not memoise, so after the access token expires each would refresh
 * with the same (single-use) refresh token and the loser would destroy the session. The key is the
 * router context, which must be created per request (never a singleton `getLoadContext`), because
 * React Router hands each loader a fresh `Request`.
 * Deferred (un-awaited) `getAuthSession` calls that settle after the response is sent lose their
 * cookie, so always await it in the loader.
 */
const inFlight = new WeakMap<object, Promise<AuthSession>>();

async function loadSession(args: LoaderFunctionArgs | ActionFunctionArgs): Promise<AuthSession> {
  const response = await authkitLoader(
    args,
    async ({ getAccessToken }) => {
      return { accessToken: getAccessToken() };
    },
    { ensureSignedIn: false },
  );

  let data: any;
  if (response && typeof response === "object" && "data" in response) {
    data = (response as any).data;
  } else if (typeof (response as any)?.json === "function") {
    data = await (response as any).json();
  } else {
    data = response;
  }

  const headers = (response as any)?.init?.headers || (response as any)?.headers;
  // Forwarded by the root middleware, once per request.
  recordRefreshedCookies(args.context, headers);

  return {
    user: data?.user || null,
    accessToken: (data?.accessToken as string) || null,
    headers,
  };
}

function loadSessionOnce(args: LoaderFunctionArgs | ActionFunctionArgs): Promise<AuthSession> {
  const key = args.context as object | undefined;
  if (!key || typeof key !== "object") {
    if (process.env.NODE_ENV === "development") {
      console.warn("getAuthSession called without a router context; refresh cookie not forwarded");
    }
    return loadSession(args);
  }
  let pending = inFlight.get(key);
  if (!pending) {
    pending = loadSession(args);
    inFlight.set(key, pending);
    // A rejected attempt (redirect, refresh failure) must not poison later calls.
    pending.catch(() => {
      if (inFlight.get(key) === pending) inFlight.delete(key);
    });
  }
  return pending;
}

export async function getAuthSession(
  args: LoaderFunctionArgs | ActionFunctionArgs,
  options: { ensureSignedIn: boolean } = { ensureSignedIn: true },
) {
  try {
    const session = await loadSessionOnce(args);
    if (session.user || !options.ensureSignedIn) return { ...session };
    // No session: nothing was refreshed, so the real ensureSignedIn redirect is safe to run.
    const response = await authkitLoader(args, async () => ({ accessToken: null }), {
      ensureSignedIn: true,
    });
    // authkit redirects when signed out; reaching here means a session appeared, so read it.
    const data = (response as any)?.data ?? response;
    return {
      user: data?.user || null,
      accessToken: (data?.accessToken as string) || null,
      headers: undefined,
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
      return { user: DEV_SESSION_USER, accessToken: DEV_ACCESS_TOKEN, headers: undefined };
    }
    throw error;
  }
}

/**
 * authkit only configures its session storage inside `authkitLoader`, so `signOut` as the first
 * request after boot throws "SessionStorage was never configured". Run a no-op loader first,
 * with the Cookie header stripped so it never verifies or refreshes a real session.
 */
export async function ensureSessionStorage(request: Request): Promise<void> {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  await authkitLoader(
    {
      request: new Request(request.url, { headers }),
      params: {},
      context: {},
    } as LoaderFunctionArgs,
    { ensureSignedIn: false },
  );
}
