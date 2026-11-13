import { afterEach, describe, expect, it, test, vi } from "vitest";
import {
  authHeader,
  DEV_ACCESS_TOKEN,
  DEV_SESSION_USER,
  ensureSessionStorage,
  getAuthSession,
  isDevBypass,
  requireAccessToken,
} from "./auth.server";

const mockAuthkitLoader = vi.fn();

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: (...args: any[]) => mockAuthkitLoader(...args),
}));

describe("isDevBypass", () => {
  it("is false by default", () => {
    expect(isDevBypass({})).toBe(false);
    expect(isDevBypass({ NODE_ENV: "development" })).toBe(false);
  });

  it("is false when the flag is not exactly true", () => {
    expect(isDevBypass({ AUTH_DEV_BYPASS: "1", NODE_ENV: "development" })).toBe(false);
    expect(isDevBypass({ AUTH_DEV_BYPASS: "false", NODE_ENV: "development" })).toBe(false);
  });

  it("is true only for the flag plus development", () => {
    expect(isDevBypass({ AUTH_DEV_BYPASS: "true", NODE_ENV: "development" })).toBe(true);
  });

  it("ignores the flag when NODE_ENV is unset or test", () => {
    expect(isDevBypass({ AUTH_DEV_BYPASS: "true" })).toBe(false);
    expect(isDevBypass({ AUTH_DEV_BYPASS: "true", NODE_ENV: "test" })).toBe(false);
  });

  it("throws when the flag is set in production", () => {
    expect(() => isDevBypass({ AUTH_DEV_BYPASS: "true", NODE_ENV: "production" })).toThrow(
      /production/i,
    );
  });
});

describe("requireAccessToken", () => {
  it("returns the token when present", () => {
    expect(requireAccessToken({ accessToken: "tok" })).toBe("tok");
  });

  it("throws a redirect to /login for null", () => {
    try {
      requireAccessToken({ accessToken: null });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(Response);
      expect((e as Response).status).toBe(302);
      expect((e as Response).headers.get("Location")).toBe("/login");
    }
  });
});

describe("authHeader", () => {
  it("builds a bearer header", () => {
    expect(authHeader({ accessToken: "tok" })).toEqual({ Authorization: "Bearer tok" });
  });

  it("redirects when there is no token", () => {
    expect(() => authHeader({ accessToken: null })).toThrow();
  });
});

describe("getAuthSession", () => {
  test("handles object with data field", async () => {
    mockAuthkitLoader.mockImplementationOnce(async (_args: any, cb: any) => {
      await cb({ getAccessToken: () => "tok-1" });
      return {
        data: { user: { id: "u1", email: "u1@test.com" }, accessToken: "tok-1" },
        init: { headers: { "Set-Cookie": "a=b" } },
      };
    });

    const session = await getAuthSession({} as any);
    expect(session.user?.id).toBe("u1");
    expect(session.accessToken).toBe("tok-1");
  });

  test("handles Response-like object with json() method", async () => {
    mockAuthkitLoader.mockResolvedValueOnce({
      json: async () => ({ user: { id: "u2" }, accessToken: "tok-2" }),
      headers: { "X-Custom": "1" },
    });

    const session = await getAuthSession({} as any, { ensureSignedIn: false });
    expect(session.user?.id).toBe("u2");
    expect(session.accessToken).toBe("tok-2");
  });

  test("handles plain object response", async () => {
    mockAuthkitLoader.mockResolvedValueOnce({
      user: { id: "u3" },
      accessToken: "tok-3",
    });

    const session = await getAuthSession({} as any);
    expect(session.user?.id).toBe("u3");
  });

  test("rethrows Response and status/headers errors", async () => {
    mockAuthkitLoader.mockRejectedValueOnce(new Response("Redirect", { status: 302 }));
    await expect(getAuthSession({} as any)).rejects.toBeInstanceOf(Response);

    mockAuthkitLoader.mockRejectedValueOnce({ status: 302, headers: {} });
    await expect(getAuthSession({} as any)).rejects.toEqual({ status: 302, headers: {} });
  });

  test("rethrows a plain Error instead of returning a session", async () => {
    const boom = new Error("Missing WorkOS config");
    mockAuthkitLoader.mockRejectedValueOnce(boom);
    await expect(getAuthSession({} as any)).rejects.toBe(boom);
  });

  describe("dev bypass", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    test("returns the dev session on a thrown error only with the dev combination", async () => {
      vi.stubEnv("AUTH_DEV_BYPASS", "true");
      vi.stubEnv("NODE_ENV", "development");
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockAuthkitLoader.mockRejectedValueOnce(new Error("Missing WorkOS config"));

      const session = await getAuthSession({} as any);
      warnSpy.mockRestore();
      expect(session.user).toEqual(DEV_SESSION_USER);
      expect(session.accessToken).toBe(DEV_ACCESS_TOKEN);
    });

    test("throws when the flag is set in production", async () => {
      vi.stubEnv("AUTH_DEV_BYPASS", "true");
      vi.stubEnv("NODE_ENV", "production");
      mockAuthkitLoader.mockRejectedValueOnce(new Error("Missing WorkOS config"));

      await expect(getAuthSession({} as any)).rejects.toThrow(/production/i);
    });
  });
});

describe("ensureSessionStorage", () => {
  test("runs a no-op authkitLoader without the Cookie header", async () => {
    mockAuthkitLoader.mockResolvedValueOnce({});
    await ensureSessionStorage(
      new Request("https://app.flump.test/logout", {
        method: "POST",
        headers: { cookie: "wos-session=sealed" },
      }),
    );
    const [args, options] = mockAuthkitLoader.mock.calls.at(-1) as any[];
    expect(args.request.headers.get("cookie")).toBeNull();
    expect(options).toEqual({ ensureSignedIn: false });
  });
});
