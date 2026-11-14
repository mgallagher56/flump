// @vitest-environment node
// happy-dom drops Set-Cookie on Response, so use the native Node fetch classes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  hasSealedSession: vi.fn(),
  backendFetch: vi.fn(),
}));

vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("@workos-inc/authkit-react-router", () => ({ signOut: mocks.signOut }));
vi.mock("~/utils/auth.server", () => ({
  ensureSessionStorage: vi.fn(),
  getAuthSession: vi.fn(async () => ({ accessToken: "tok", user: { id: "u1" } })),
  requireAccessToken: ({ accessToken }: { accessToken?: string }) => accessToken,
}));
vi.mock("~/utils/sessionCookie.server", () => ({ hasSealedSession: mocks.hasSealedSession }));
vi.mock("~/services/backend-client.server", () => ({ backendFetch: mocks.backendFetch }));

import { deleteAccountAction } from "~/features/settings/account.server";
import { action as logoutAction } from "~/routes/logout._index";
import {
  appendSessionClearCookies,
  cookieName,
  sessionClearCookies,
} from "./session-cookies.server";

const APP = "https://app.flump.test";

const logout = async (headers: Record<string, string> = {}) =>
  (await logoutAction({
    request: new Request(`${APP}/logout`, { method: "POST", headers }),
    params: {},
    context: {},
  } as never)) as Response;

const deleteAccount = async (headers: Record<string, string> = {}) => {
  const form = new FormData();
  form.set("confirmation", "DELETE");
  return (await deleteAccountAction(
    {
      request: new Request(`${APP}/app/profile`, { method: "POST", headers }),
      params: {},
      context: {},
    } as never,
    form,
  )) as Response;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hasSealedSession.mockResolvedValue(false);
  mocks.backendFetch.mockResolvedValue({ status: "deleted" });
  vi.stubEnv("VITE_MARKETING_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("sessionClearCookies", () => {
  it("clears the session and presence cookies, Secure over https", () => {
    const cookies = sessionClearCookies(new Request(`${APP}/x`), { NODE_ENV: "test" });
    expect(cookies.map(cookieName)).toEqual(["wos-session", "flump_has_session"]);
    expect(cookies[1]).toBe("flump_has_session=; Path=/; SameSite=Lax; Max-Age=0; Secure");
    const http = sessionClearCookies(new Request("http://localhost/x"), { NODE_ENV: "test" });
    expect(http[1]).toBe("flump_has_session=; Path=/; SameSite=Lax; Max-Age=0");
    const proxied = sessionClearCookies(
      new Request("http://internal/x", { headers: { "x-forwarded-proto": "https" } }),
      { NODE_ENV: "test" },
    );
    expect(proxied[1]).toContain("; Secure");
  });

  it("adds the legacy cookie in production when the name changed", () => {
    const cookies = sessionClearCookies(new Request(`${APP}/x`), {
      NODE_ENV: "production",
      WORKOS_COOKIE_NAME: "__Host-wos-session",
    });
    expect(cookies.map(cookieName)).toEqual([
      "__Host-wos-session",
      "flump_has_session",
      "wos-session",
    ]);
  });

  it("clears the dev session cookie in the e2e dev-session mode", () => {
    const cookies = sessionClearCookies(new Request("http://localhost/x"), {
      NODE_ENV: "development",
      E2E_DEV_SESSION: "true",
      AUTH_DEV_BYPASS: "true",
    });
    expect(cookies.map(cookieName)).toEqual(["flump_dev_session", "flump_has_session"]);
  });

  it("appendSessionClearCookies never doubles a cookie the response already sets", () => {
    const headers = new Headers();
    headers.append("Set-Cookie", "wos-session=; Path=/; Max-Age=0; HttpOnly");
    appendSessionClearCookies(headers, new Request(`${APP}/x`), { NODE_ENV: "test" });
    expect(headers.getSetCookie().map(cookieName)).toEqual(["wos-session", "flump_has_session"]);
    expect(headers.getSetCookie()[0]).toBe("wos-session=; Path=/; Max-Age=0; HttpOnly");
  });
});

describe("/logout and account deletion clear the same cookie set", () => {
  it.each([
    ["test", {}],
    ["production", {}],
    ["test behind the https proxy", { "x-forwarded-proto": "https" }],
  ])("in %s", async (label, headers) => {
    if (label === "production") {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("WORKOS_COOKIE_NAME", "__Host-wos-session");
    }
    const fromLogout = (await logout(headers)).headers.getSetCookie();
    const fromDelete = (await deleteAccount(headers)).headers.getSetCookie();
    expect(fromLogout.length).toBeGreaterThan(1);
    expect(fromDelete.sort()).toEqual(fromLogout.sort());
    expect(fromLogout.sort()).toEqual(
      sessionClearCookies(new Request(`${APP}/x`, { headers })).sort(),
    );
  });

  it("in the e2e dev-session mode", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("E2E_DEV_SESSION", "true");
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("WORKOS_API_KEY", "");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "");
    const fromLogout = (await logout()).headers.getSetCookie();
    const fromDelete = (await deleteAccount()).headers.getSetCookie();
    expect(fromDelete.sort()).toEqual(fromLogout.sort());
    expect(fromLogout.map(cookieName).sort()).toEqual(["flump_dev_session", "flump_has_session"]);
  });

  it("when authkit ends the WorkOS session, logout keeps its destroy cookie and adds the rest", async () => {
    mocks.hasSealedSession.mockResolvedValue(true);
    mocks.signOut.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { "Set-Cookie": "wos-session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" },
      }),
    );
    const fromLogout = (await logout()).headers.getSetCookie();
    const fromDelete = (await deleteAccount()).headers.getSetCookie();
    expect(fromLogout.map(cookieName).sort()).toEqual(fromDelete.map(cookieName).sort());
  });
});
