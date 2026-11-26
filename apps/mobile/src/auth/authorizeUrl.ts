/**
 * The AuthKit addresses the app opens in the system browser sheet, and the reading of the redirect
 * that comes back (plan section 5.2; workos.com/docs/reference/authkit). Query strings are built and
 * read by hand: React Native's URL has no full `searchParams`.
 */
import type { AuthConfig } from "../config";

export type AuthorizeScreen = "sign-in" | "sign-up";

export type CallbackResult =
  | { kind: "code"; code: string }
  | { kind: "denied" }
  | { kind: "failed" }
  | { kind: "state-mismatch" };

type Endpoints = Pick<AuthConfig, "authBaseUrl" | "clientId" | "redirectUri">;

const query = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

export function buildAuthorizeUrl(
  config: Endpoints,
  pkce: { challenge: string; state: string },
  screen: AuthorizeScreen,
): string {
  const params: Record<string, string> = {
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    code_challenge: pkce.challenge,
    code_challenge_method: "S256",
    state: pkce.state,
    provider: "authkit",
    // Always a fresh sign-in: a WorkOS session left in the browser (Android's Custom Tab shares
    // Chrome's cookies) never signs anyone in without asking. iOS's private sheet has none anyway.
    // "A value of 0 forces the user to re-authenticate" (get-authorization-url, read 26 Nov 2026).
    max_age: "0",
  };
  if (screen === "sign-up") params.screen_hint = "sign-up";
  return `${config.authBaseUrl}/user_management/authorize?${query(params)}`;
}

/** The decoded pairs of a query string. A repeated key keeps its first value. */
export function readQuery(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of text.split("&")) {
    if (!pair) continue;
    const at = pair.indexOf("=");
    const rawKey = at === -1 ? pair : pair.slice(0, at);
    const rawValue = at === -1 ? "" : pair.slice(at + 1);
    try {
      const key = decodeURIComponent(rawKey.replaceAll("+", " "));
      if (!Object.hasOwn(out, key)) out[key] = decodeURIComponent(rawValue.replaceAll("+", " "));
    } catch {
      // A malformed escape is dropped: the caller then sees a missing value.
    }
  }
  return out;
}

/**
 * Reads the redirect. The state is checked first, so nothing from a mismatched redirect is used,
 * not even its error.
 */
export function parseCallback(
  url: string,
  redirectUri: string,
  expectedState: string,
): CallbackResult {
  const withoutFragment = url.split("#")[0] ?? "";
  const at = withoutFragment.indexOf("?");
  const base = at === -1 ? withoutFragment : withoutFragment.slice(0, at);
  if (base !== redirectUri) return { kind: "failed" };
  const params = readQuery(at === -1 ? "" : withoutFragment.slice(at + 1));
  if (!params.state || params.state !== expectedState) return { kind: "state-mismatch" };
  if (params.error === "access_denied") return { kind: "denied" };
  if (params.error || !params.code) return { kind: "failed" };
  return { kind: "code", code: params.code };
}
