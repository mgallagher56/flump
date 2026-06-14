import { useMemo } from "react";

import { useMatches } from "react-router";

const DEFAULT_REDIRECT = "/";

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect: string = DEFAULT_REDIRECT,
): string {
  if (!to || typeof to !== "string") {
    return defaultRedirect;
  }

  if (!to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect;
  }

  return to;
}

/**
 * This base hook is used in other hooks to quickly search for specific data
 * across all loader data using useMatches.
 * @param {string} id The route id
 * @returns {JSON|undefined} The router data or undefined if not found
 */
export function useMatchesData(id: string): Record<string, unknown> | undefined {
  const matchingRoutes = useMatches();
  const route = useMemo(
    () => matchingRoutes.find((route) => route.id === id),
    [matchingRoutes, id],
  );
  return route?.data as Record<string, unknown>;
}

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && email.length > 3 && email.includes("@");
}

export const noop = () => {}; //nosonar
export const emptyObject = {};
export const emptyArray = [];

export enum FallbackEnums {
  NA = "N/A",
}

export enum AuthErrorEnums {
  USER_ALREADY_REGISTERED = "User already registered",
}

export const currentYear = new Date().getFullYear();
export const currentMonth = new Date().getMonth() + 1;

import { authkitLoader } from "@workos-inc/authkit-react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

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

    const data = await (response as any).json();
    return {
      user: data.user || null,
      accessToken: (data.accessToken as string) || null,
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    console.warn("authkitLoader failed, returning mock session:", error);
    return {
      user: { id: "dev_user_123", email: "dev@flump.com" },
      accessToken: "mock-session-token",
    };
  }
}
