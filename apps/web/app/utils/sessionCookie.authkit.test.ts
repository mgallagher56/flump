// @vitest-environment node
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The global test setup stubs react-router; authkit and hasSealedSession need the real thing.
vi.mock("react-router", async () => await vi.importActual("react-router"));

/**
 * Format guard for `hasSealedSession`. That helper re-implements the session-cookie check with
 * its own react-router cookie storage, and its sibling tests build cookies with that same library,
 * so they could never notice authkit changing its cookie format (every logout would then skip
 * `signOut` silently). Here the cookie is produced by authkit itself: the REAL `getSignInUrl`
 * starts a PKCE flow and the REAL `authLoader` (the `/callback` handler) completes it and commits
 * the session cookie. The only fake is the single network call, `authenticateWithCode`, stubbed
 * on the real WorkOS client with runtime-built tokens.
 *
 * authkit's cookie settings are process-wide and fixed on first use, so this file runs the
 * production-like configuration (https redirect URI, `__Host-wos-session`).
 */
const password = randomBytes(24).toString("hex");
const COOKIE_NAME = "__Host-wos-session";
const savedEnv = { ...process.env };

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const fakeJwt = () => `${b64({ alg: "none" })}.${b64({ sub: "user_1", sid: "session_1" })}.sig`;

function envFor(overridePassword = password) {
  return { WORKOS_COOKIE_PASSWORD: overridePassword, WORKOS_COOKIE_NAME: COOKIE_NAME };
}

const request = (cookie?: string) =>
  new Request("https://web.example.test/logout", {
    method: "POST",
    headers: cookie ? { Cookie: cookie } : {},
  });

/** Runs authkit's own sign-in + callback and returns the `name=value` session cookie it emitted. */
async function authkitSessionCookie(): Promise<string> {
  const { authLoader, getSignInUrl, getWorkOS } = await import("@workos-inc/authkit-react-router");

  const login = await getSignInUrl("/app", new Request("https://web.example.test/login"));
  const state = new URL(login.url).searchParams.get("state");
  expect(state).toBeTruthy();
  const verifierCookie = new Headers(login.headers as HeadersInit)
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(verifierCookie).not.toBe("");

  const authenticateWithCode = vi
    .spyOn(getWorkOS().userManagement, "authenticateWithCode")
    .mockResolvedValue({
      accessToken: fakeJwt(),
      refreshToken: randomBytes(12).toString("hex"),
      user: { id: "user_1", email: "person@example.test", object: "user" },
    } as never);

  const callback = new Request(
    `https://web.example.test/callback?code=${randomBytes(6).toString("hex")}&state=${state}`,
    { headers: { Cookie: verifierCookie } },
  );
  const response = (await authLoader()({ request: callback, params: {}, context: {} } as never)) as
    | Response
    | undefined;
  expect(authenticateWithCode).toHaveBeenCalledOnce();
  expect(response?.status).toBe(302);

  const sessionSetCookie = response?.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  expect(sessionSetCookie, "authkit committed no session cookie").toBeDefined();
  return (sessionSetCookie as string).split(";")[0] as string;
}

describe("hasSealedSession against a cookie authkit itself emitted", () => {
  beforeAll(() => {
    Object.assign(process.env, {
      WORKOS_API_KEY: `test_${randomBytes(8).toString("hex")}`,
      WORKOS_CLIENT_ID: `client_${randomBytes(8).toString("hex")}`,
      WORKOS_COOKIE_PASSWORD: password,
      WORKOS_COOKIE_NAME: COOKIE_NAME,
      WORKOS_REDIRECT_URI: "https://web.example.test/callback",
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  });

  it("recognises the session cookie authkit's callback handler commits", async () => {
    const { hasSealedSession } = await import("./sessionCookie.server");
    const cookie = await authkitSessionCookie();
    expect(cookie.startsWith(`${COOKIE_NAME}=`)).toBe(true);
    expect(await hasSealedSession(request(cookie), envFor())).toBe(true);
  });

  it("rejects that cookie under a different secret (tampered or rotated)", async () => {
    const { hasSealedSession } = await import("./sessionCookie.server");
    const cookie = await authkitSessionCookie();
    expect(await hasSealedSession(request(cookie), envFor(randomBytes(24).toString("hex")))).toBe(
      false,
    );
  });

  it("rejects the cookie when its signature is altered", async () => {
    const { hasSealedSession } = await import("./sessionCookie.server");
    const cookie = await authkitSessionCookie();
    const flipped = `${cookie.slice(0, -2)}${cookie.endsWith("AA") ? "BB" : "AA"}`;
    expect(await hasSealedSession(request(flipped), envFor())).toBe(false);
  });
});
