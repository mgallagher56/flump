import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@workos-inc/authkit-react-router", () => ({
  authkitLoader: vi.fn(),
}));

describe("auth.server startup check (runs when the server code loads)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws at import when AUTH_DEV_BYPASS=true in production", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "production");
    await expect(import("./auth.server")).rejects.toThrow("AUTH_DEV_BYPASS");
  });

  it("does not throw at import with a clean environment", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "");
    await expect(import("./auth.server")).resolves.toBeDefined();
  });

  it("does not throw at import with the dev combination", async () => {
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    await expect(import("./auth.server")).resolves.toBeDefined();
  });

  it("throws at import when E2E_DEV_SESSION=true in production", async () => {
    vi.stubEnv("E2E_DEV_SESSION", "true");
    vi.stubEnv("AUTH_DEV_BYPASS", "");
    vi.stubEnv("NODE_ENV", "production");
    await expect(import("./auth.server")).rejects.toThrow("E2E_DEV_SESSION");
  });

  it("throws at import when E2E_DEV_SESSION=true without the dev bypass", async () => {
    vi.stubEnv("E2E_DEV_SESSION", "true");
    vi.stubEnv("AUTH_DEV_BYPASS", "");
    vi.stubEnv("NODE_ENV", "development");
    await expect(import("./auth.server")).rejects.toThrow("AUTH_DEV_BYPASS");
  });

  it("serves the dev session only when the cookie is present (test-only mode)", async () => {
    vi.stubEnv("E2E_DEV_SESSION", "true");
    vi.stubEnv("AUTH_DEV_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("WORKOS_API_KEY", "");
    vi.stubEnv("RAILWAY_ENVIRONMENT", "");
    const { getAuthSession, DEV_SESSION_USER } = await import("./auth.server");
    const withCookie = {
      request: { headers: new Headers({ cookie: "flump_dev_session=1" }) },
    } as any;
    const without = { request: { headers: new Headers() } } as any;
    expect((await getAuthSession(withCookie)).user).toEqual(DEV_SESSION_USER);
    expect((await getAuthSession(without, { ensureSignedIn: false })).user).toBeNull();
    await expect(getAuthSession(without)).rejects.toBeInstanceOf(Response);
  });

  it("ignores the dev session cookie when the flag is off", async () => {
    vi.stubEnv("E2E_DEV_SESSION", "");
    vi.stubEnv("AUTH_DEV_BYPASS", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("WORKOS_REDIRECT_URI", "https://app.flump.test/callback");
    const { authkitLoader } = await import("@workos-inc/authkit-react-router");
    vi.mocked(authkitLoader).mockResolvedValue({ user: null, accessToken: null } as any);
    const { getAuthSession } = await import("./auth.server");
    const args = {
      request: { headers: new Headers({ cookie: "flump_dev_session=1" }) },
      context: {},
    } as any;
    expect((await getAuthSession(args, { ensureSignedIn: false })).user).toBeNull();
  });

  describe("session lifetime policy", () => {
    // Every test starts from a clean, unset policy env (restored by unstubAllEnvs in afterEach).
    beforeEach(() => {
      vi.stubEnv("AUTH_DEV_BYPASS", undefined);
      vi.stubEnv("WORKOS_REDIRECT_URI", undefined);
      vi.stubEnv("WORKOS_COOKIE_MAX_AGE", undefined);
      vi.stubEnv("WORKOS_COOKIE_NAME", undefined);
    });

    const production = () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("WORKOS_REDIRECT_URI", "https://app.flump.test/callback");
    };

    it("defaults WORKOS_COOKIE_MAX_AGE to 14 days", async () => {
      await import("./auth.server");
      expect(process.env.WORKOS_COOKIE_MAX_AGE).toBe("1209600");
    });

    it.each(["0", "-1", "1.5", "99999999999999999999", "1209601"])(
      "fails in production when the max-age is %s",
      async (value) => {
        production();
        vi.stubEnv("WORKOS_COOKIE_MAX_AGE", value);
        await expect(import("./auth.server")).rejects.toThrow("WORKOS_COOKIE_MAX_AGE");
      },
    );

    it("accepts a whitespace-padded max-age within 14 days in production", async () => {
      production();
      vi.stubEnv("WORKOS_COOKIE_MAX_AGE", " 3600 ");
      await expect(import("./auth.server")).resolves.toBeDefined();
    });

    it("accepts exactly 14 days in production", async () => {
      production();
      vi.stubEnv("WORKOS_COOKIE_MAX_AGE", "1209600");
      await expect(import("./auth.server")).resolves.toBeDefined();
    });

    it("accepts an uppercase HTTPS redirect URI in production", async () => {
      production();
      vi.stubEnv("WORKOS_REDIRECT_URI", "HTTPS://app.flump.test/callback");
      await expect(import("./auth.server")).resolves.toBeDefined();
    });

    it("keeps an explicit max-age of at most 14 days in production", async () => {
      production();
      vi.stubEnv("WORKOS_COOKIE_MAX_AGE", "3600");
      await import("./auth.server");
      expect(process.env.WORKOS_COOKIE_MAX_AGE).toBe("3600");
    });

    it("fails in production when the max-age is not a number", async () => {
      production();
      vi.stubEnv("WORKOS_COOKIE_MAX_AGE", "forever");
      await expect(import("./auth.server")).rejects.toThrow("WORKOS_COOKIE_MAX_AGE");
    });

    it("fails in production when the redirect URI is not https", async () => {
      production();
      vi.stubEnv("WORKOS_REDIRECT_URI", "http://app.flump.test/callback");
      await expect(import("./auth.server")).rejects.toThrow("WORKOS_REDIRECT_URI");
    });

    it("fails in production when the redirect URI is missing", async () => {
      production();
      vi.stubEnv("WORKOS_REDIRECT_URI", undefined);
      await expect(import("./auth.server")).rejects.toThrow("WORKOS_REDIRECT_URI");
    });

    it("allows an http redirect URI outside production", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("WORKOS_REDIRECT_URI", "http://localhost:5173/callback");
      await expect(import("./auth.server")).resolves.toBeDefined();
    });

    it("selects __Host-wos-session in production", async () => {
      production();
      await import("./auth.server");
      expect(process.env.WORKOS_COOKIE_NAME).toBe("__Host-wos-session");
    });

    it("respects an explicit WORKOS_COOKIE_NAME in production", async () => {
      production();
      vi.stubEnv("WORKOS_COOKIE_NAME", "__Host-custom");
      await import("./auth.server");
      expect(process.env.WORKOS_COOKIE_NAME).toBe("__Host-custom");
    });

    it.each(["development", "test"])("leaves the cookie name unset in %s", async (nodeEnv) => {
      vi.stubEnv("NODE_ENV", nodeEnv);
      await import("./auth.server");
      expect(process.env.WORKOS_COOKIE_NAME).toBeUndefined();
    });
  });
});
