// @vitest-environment node
// happy-dom drops Set-Cookie on Response, so use the native Node fetch classes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  order: [] as string[],
  ensureSessionStorage: vi.fn(),
  hasSealedSession: vi.fn(),
}));

vi.mock("@workos-inc/authkit-react-router", () => ({ signOut: mocks.signOut }));
vi.mock("~/utils/auth.server", () => ({
  ensureSessionStorage: mocks.ensureSessionStorage,
  // Any call would be a regression: logout must never read or refresh the session.
  getAuthSession: () => {
    throw new Error("logout must not call getAuthSession");
  },
}));
vi.mock("~/utils/sessionCookie.server", () => ({ hasSealedSession: mocks.hasSealedSession }));

import { action, loader } from "./logout._index";

// The global test setup stubs react-router; the loader needs the real `redirect`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const makeArgs = (url: string, method = "GET", headers?: Record<string, string>) =>
  ({ request: new Request(url, { method, headers }), params: {}, context: {} }) as any;

const CLEAR_COOKIE = "flump_has_session=; Path=/; SameSite=Lax; Max-Age=0";

beforeEach(() => {
  mocks.order.length = 0;
  mocks.ensureSessionStorage.mockReset();
  mocks.ensureSessionStorage.mockImplementation(async () => {
    mocks.order.push("ensure");
  });
  mocks.hasSealedSession.mockReset();
  mocks.hasSealedSession.mockResolvedValue(true);
  mocks.signOut.mockReset();
  mocks.signOut.mockImplementation(async () => {
    mocks.order.push("signOut");
    return new Response(null, { status: 302 });
  });
  vi.stubEnv("VITE_MARKETING_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("logout action", () => {
  it("configures the session storage before signing out (first request after boot)", async () => {
    await action(makeArgs("http://localhost:3000/logout", "POST"));
    expect(mocks.order).toEqual(["ensure", "signOut"]);
  });

  it("sends a 'Sign in again' sign-out to /login with the settings Data tab return path", async () => {
    const body = new URLSearchParams({ next: "/app/profile?tab=data" });
    await action({
      request: new Request("https://web.example.test/logout", { method: "POST", body }),
      params: {},
      context: {},
    } as any);
    expect(mocks.signOut.mock.calls[0][1]).toEqual({
      returnTo: "https://web.example.test/login?returnTo=%2Fapp%2Fprofile%3Ftab%3Ddata",
    });
  });

  it("ignores any other return path (no open redirect)", async () => {
    vi.stubEnv("VITE_MARKETING_URL", "https://marketing.example.test");
    const body = new URLSearchParams({ next: "https://evil.example/" });
    await action({
      request: new Request("https://web.example.test/logout", { method: "POST", body }),
      params: {},
      context: {},
    } as any);
    expect(mocks.signOut.mock.calls[0][1]).toEqual({ returnTo: "https://marketing.example.test" });
  });

  it("uses VITE_MARKETING_URL as returnTo when set", async () => {
    vi.stubEnv("VITE_MARKETING_URL", "https://marketing.example.test");
    await action(makeArgs("http://localhost:3000/logout", "POST"));
    expect(mocks.signOut).toHaveBeenCalledWith(expect.any(Request), {
      returnTo: "https://marketing.example.test",
    });
  });

  it.each(["http://localhost:3000/logout", "http://127.0.0.1:3000/logout"])(
    "falls back to http://localhost:3001 on %s",
    async (url) => {
      await action(makeArgs(url, "POST"));
      expect(mocks.signOut.mock.calls[0][1]).toEqual({ returnTo: "http://localhost:3001" });
    },
  );

  it("falls back to the deployed marketing site elsewhere, not the request origin", async () => {
    await action(makeArgs("https://web.example.test/logout", "POST"));
    expect(mocks.signOut.mock.calls[0][1]).toEqual({
      returnTo: "https://marketing-production-d21f.up.railway.app",
    });
  });

  it("clears the presence cookie host-only (no Domain) on localhost", async () => {
    const res = (await action(makeArgs("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([CLEAR_COOKIE]);
  });

  it("appends the legacy wos-session clear without clobbering authkit cookies in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WORKOS_COOKIE_NAME", "__Host-wos-session");
    mocks.signOut.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { "Set-Cookie": "__Host-wos-session=; Max-Age=0; Path=/" },
      }),
    );
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([
      "__Host-wos-session=; Max-Age=0; Path=/",
      `${CLEAR_COOKIE}; Secure`,
      "wos-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
    ]);
  });

  it("does not add the legacy clear when the configured name is wos-session or outside production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WORKOS_COOKIE_NAME", "wos-session");
    let res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WORKOS_COOKIE_NAME", "__Host-wos-session");
    res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
  });

  it("clears the presence cookie host-only with Secure on https hosts", async () => {
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
  });

  it("keeps WorkOS Set-Cookie headers and status", async () => {
    const upstream = new Response(null, { status: 302, statusText: "Found" });
    upstream.headers.append("Set-Cookie", "wos-session=; Max-Age=0; Path=/");
    upstream.headers.set("Location", "https://marketing.example.test");
    mocks.signOut.mockResolvedValue(upstream);

    const res = (await action(makeArgs("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://marketing.example.test");
    expect(res.headers.getSetCookie()).toEqual(["wos-session=; Max-Age=0; Path=/", CLEAR_COOKIE]);
  });

  it("returns a non-Response signOut result unchanged", async () => {
    const data = { ok: true };
    mocks.signOut.mockResolvedValue(data);
    expect(await action(makeArgs("http://localhost:3000/logout", "POST"))).toBe(data);
  });

  it("adds Secure when x-forwarded-proto is https on a plain-http request", async () => {
    const res = (await action(
      makeArgs("http://web.up.railway.app/logout", "POST", { "x-forwarded-proto": "https" }),
    )) as Response;
    expect(res.headers.getSetCookie()).toEqual([`${CLEAR_COOKIE}; Secure`]);
  });

  it("does not add Secure when x-forwarded-proto is http", async () => {
    const res = (await action(
      makeArgs("http://localhost:3000/logout", "POST", { "x-forwarded-proto": "http" }),
    )) as Response;
    expect(res.headers.getSetCookie()).toEqual([CLEAR_COOKIE]);
  });
});

describe("logout action without a usable session", () => {
  const MARKETING = "https://marketing-production-d21f.up.railway.app";
  const PROD_SESSION_CLEAR =
    "__Host-wos-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax";
  const LEGACY_CLEAR = "wos-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax";

  const expectClearedRedirect = (res: Response) => {
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(MARKETING);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(res.headers.getSetCookie()).toEqual([
      PROD_SESSION_CLEAR,
      `${CLEAR_COOKIE}; Secure`,
      LEGACY_CLEAR,
    ]);
  };

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WORKOS_COOKIE_NAME", "__Host-wos-session");
  });

  it("no session cookie: 302 to marketing, no signOut, three cookie clears", async () => {
    mocks.hasSealedSession.mockResolvedValue(false);
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expectClearedRedirect(res);
  });

  it("cookie present but no jwt (the original 500: signOut would destructure null) is the same", async () => {
    // hasSealedSession is false for a cookie that parses to a session without a `jwt`.
    mocks.hasSealedSession.mockResolvedValue(false);
    mocks.signOut.mockRejectedValue(new TypeError("Cannot destructure property 'accessToken'"));
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expectClearedRedirect(res);
  });

  it("expired session (sealed jwt with an expired access token) still goes through signOut", async () => {
    // authkit's terminateSession unseals without refreshing and decodes the claims, so an
    // expired token still yields the WorkOS logout redirect plus the destroy cookie.
    mocks.hasSealedSession.mockResolvedValue(true);
    mocks.signOut.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: "https://auth.example.test/logout?session_id=sid",
          "Set-Cookie": "__Host-wos-session=; Max-Age=0; Path=/",
        },
      }),
    );
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(res.headers.get("Location")).toBe("https://auth.example.test/logout?session_id=sid");
    expect(res.headers.getSetCookie()).toEqual([
      "__Host-wos-session=; Max-Age=0; Path=/",
      `${CLEAR_COOKIE}; Secure`,
      LEGACY_CLEAR,
    ]);
  });

  it("uses wos-session without Secure or the legacy clear in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WORKOS_COOKIE_NAME", "");
    mocks.hasSealedSession.mockResolvedValue(false);
    const res = (await action(makeArgs("http://localhost:3000/logout", "POST"))) as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("http://localhost:3001");
    expect(res.headers.getSetCookie()).toEqual([
      "wos-session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax",
      CLEAR_COOKIE,
    ]);
  });

  it("signed in but signOut throws: still clears the cookies and redirects (never 500)", async () => {
    // Chosen: logout is a "make the browser forget" action, so a failing WorkOS/cookie unseal
    // falls back to the local clear rather than leaving the user signed in behind an error page.
    mocks.signOut.mockRejectedValue(
      new TypeError("Cannot destructure property 'accessToken' from null or undefined"),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = (await action(makeArgs("https://web.example.test/logout", "POST"))) as Response;
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(MARKETING);
    expect(res.headers.getSetCookie()).toEqual([
      PROD_SESSION_CLEAR,
      `${CLEAR_COOKIE}; Secure`,
      LEGACY_CLEAR,
    ]);
    expect(warn.mock.calls.flat().join(" ")).toContain("TypeError");
    warn.mockRestore();
  });
});

describe("logout loader (GET)", () => {
  it("never signs out and sets no cookies", async () => {
    const res = (await loader()) as Response;
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/");
    expect(res.headers.getSetCookie()).toEqual([]);
  });
});
