import { authkitLoader } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

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
      console.warn("authkitLoader failed, using dev bypass session:", error);
      return { user: DEV_SESSION_USER, accessToken: DEV_ACCESS_TOKEN };
    }
    throw error;
  }
}
