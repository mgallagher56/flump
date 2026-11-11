// @vitest-environment node
// happy-dom drops Set-Cookie on Response, so use the native Node fetch classes.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The global test setup stubs parts of react-router; the loaders need the real `redirect`.
vi.mock("react-router", async () => await vi.importActual("react-router"));

const mocks = vi.hoisted(() => {
  const workosLoader = vi.fn();
  // Recorded at import time because the global test setup clears mock call history between tests.
  const authLoaderArgs: unknown[] = [];
  const authLoader = vi.fn((...args: unknown[]) => {
    authLoaderArgs.push(...args);
    return workosLoader;
  });
  return { workosLoader, authLoader, authLoaderArgs, configure: vi.fn() };
});

vi.mock("@workos-inc/authkit-react-router", () => ({
  authLoader: mocks.authLoader,
  configure: mocks.configure,
}));

import { loader } from "./callback";

const callLoader = (url: string) =>
  loader({ request: new Request(url), params: {}, context: {} } as any) as Promise<any>;

const SESSION_COOKIE = "flump_has_session=1; Path=/; SameSite=Lax; Max-Age=2592000";

beforeEach(() => {
  mocks.workosLoader.mockReset();
  mocks.configure.mockReset();
  mocks.workosLoader.mockResolvedValue(new Response(null, { status: 302 }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("callback loader", () => {
  it("builds the WorkOS loader once at import with returnPathname /app", () => {
    expect(mocks.authLoaderArgs).toEqual([{ returnPathname: "/app" }]);
  });

  it("redirects to /login when there is no code and never calls WorkOS", async () => {
    const res = await callLoader("http://localhost:3000/callback");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/login");
    expect(mocks.workosLoader).not.toHaveBeenCalled();
    expect(mocks.configure).not.toHaveBeenCalled();
  });

  it("sets the presence cookie without a Domain on localhost", async () => {
    const res = await callLoader("http://localhost:3000/callback?code=abc");
    expect(res.headers.getSetCookie()).toEqual([SESSION_COOKIE]);
  });

  it("sets Domain=.flump.co.uk on app.flump.co.uk", async () => {
    const res = await callLoader("https://app.flump.co.uk/callback?code=abc");
    expect(res.headers.getSetCookie()).toEqual([`${SESSION_COOKIE}; Domain=.flump.co.uk`]);
  });

  it("PINS current behaviour: evilflump.co.uk also gets the Domain", async () => {
    // Known endsWith gap: hostname.endsWith("flump.co.uk") matches lookalike hosts.
    // Flagged for follow-up, intentionally not fixed here.
    const res = await callLoader("https://evilflump.co.uk/callback?code=abc");
    expect(res.headers.getSetCookie()).toEqual([`${SESSION_COOKIE}; Domain=.flump.co.uk`]);
  });

  describe("configure", () => {
    it.each([
      ["http://localhost:3000", "http://localhost:3000"],
      ["http://127.0.0.1:3000", "http://127.0.0.1:3000"],
    ])("overrides WORKOS_REDIRECT_URI on %s", async (origin, expected) => {
      await callLoader(`${origin}/callback?code=abc`);
      expect(mocks.configure).toHaveBeenCalledTimes(1);
      const getValue = mocks.configure.mock.calls[0][0] as (key: string) => unknown;
      expect(typeof getValue).toBe("function");
      expect(getValue("WORKOS_REDIRECT_URI")).toBe(`${expected}/callback`);
    });

    it("falls back to process.env for other keys", async () => {
      vi.stubEnv("SOME_OTHER_KEY", "value");
      await callLoader("http://localhost:3000/callback?code=abc");
      const getValue = mocks.configure.mock.calls[0][0] as (key: string) => unknown;
      expect(getValue("SOME_OTHER_KEY")).toBe("value");
    });

    it("is not called on app.flump.co.uk", async () => {
      await callLoader("https://app.flump.co.uk/callback?code=abc");
      expect(mocks.configure).not.toHaveBeenCalled();
    });

    it("never resets: after a later app.flump.co.uk request the last-installed callback still returns the localhost redirect URI", async () => {
      await callLoader("http://localhost:3000/callback?code=abc");
      expect(mocks.configure).toHaveBeenCalledTimes(1);
      const installed = mocks.configure.mock.calls[0][0] as (key: string) => unknown;

      await callLoader("https://app.flump.co.uk/callback?code=def");
      // Nothing re-configured or reset WorkOS state on the production request, so the last
      // callback WorkOS holds is still the localhost one (global state leak, pinned).
      expect(mocks.configure).toHaveBeenCalledTimes(1);
      expect(installed("WORKOS_REDIRECT_URI")).toBe("http://localhost:3000/callback");
    });
  });

  it("preserves upstream status and existing Set-Cookie headers", async () => {
    const upstream = new Response("body", { status: 303, statusText: "See Other" });
    upstream.headers.append("Set-Cookie", "wos-session=abc; Path=/");
    upstream.headers.set("Location", "/app");
    mocks.workosLoader.mockResolvedValue(upstream);

    const res = await callLoader("http://localhost:3000/callback?code=abc");
    expect(res.status).toBe(303);
    expect(res.statusText).toBe("See Other");
    expect(res.headers.get("Location")).toBe("/app");
    expect(res.headers.getSetCookie()).toEqual(["wos-session=abc; Path=/", SESSION_COOKIE]);
    expect(await res.text()).toBe("body");
  });

  it("returns a non-Response upstream result unchanged", async () => {
    const data = { error: { message: "nope" } };
    mocks.workosLoader.mockResolvedValue(data);
    const res = await callLoader("http://localhost:3000/callback?code=abc");
    expect(res).toBe(data);
  });

  describe("failure handling", () => {
    it("rejects when the WorkOS loader throws, without swallowing the error", async () => {
      const boom = new Error("workos exploded");
      mocks.workosLoader.mockImplementation(() => {
        throw boom;
      });
      await expect(callLoader("http://localhost:3000/callback?code=abc")).rejects.toBe(boom);
    });

    it("rejects when the WorkOS loader rejects, so no presence cookie can be set", async () => {
      const boom = new Error("token exchange failed");
      mocks.workosLoader.mockRejectedValue(boom);
      await expect(callLoader("https://app.flump.co.uk/callback?code=abc")).rejects.toBe(boom);
    });

    it.each([
      [401, "Unauthorized"],
      [500, "Internal Server Error"],
    ])(
      "passes an upstream %i Response through with its status preserved",
      async (status, statusText) => {
        const upstream = new Response("denied", { status, statusText });
        upstream.headers.append("Set-Cookie", "wos-session=; Max-Age=0; Path=/");
        mocks.workosLoader.mockResolvedValue(upstream);

        const res = await callLoader("http://localhost:3000/callback?code=abc");
        expect(res.status).toBe(status);
        expect(res.statusText).toBe(statusText);
        expect(await res.text()).toBe("denied");
        // PINS current behaviour: the loader appends flump_has_session=1 to ANY upstream
        // Response, error statuses included. Only a thrown/rejected loader skips the cookie.
        expect(res.headers.getSetCookie()).toEqual([
          "wos-session=; Max-Age=0; Path=/",
          SESSION_COOKIE,
        ]);
      },
    );
  });
});
