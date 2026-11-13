// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  DEV_SESSION_COOKIE,
  devSessionClearCookie,
  devSessionSetCookie,
  hasDevSessionCookie,
  isDevSessionEnabled,
} from "./devSession.server";

const dev = { NODE_ENV: "development", AUTH_DEV_BYPASS: "true" };

describe("isDevSessionEnabled", () => {
  it("is off by default and when the flag is not exactly true", () => {
    expect(isDevSessionEnabled({})).toBe(false);
    expect(isDevSessionEnabled({ ...dev })).toBe(false);
    expect(isDevSessionEnabled({ ...dev, E2E_DEV_SESSION: "1" })).toBe(false);
    expect(isDevSessionEnabled({ ...dev, E2E_DEV_SESSION: "TRUE" })).toBe(false);
  });

  it("is on only with the flag plus the dev bypass in development", () => {
    expect(isDevSessionEnabled({ ...dev, E2E_DEV_SESSION: "true" })).toBe(true);
  });

  it("is off in production and throws when the flag is set there", () => {
    expect(isDevSessionEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(() =>
      isDevSessionEnabled({ ...dev, NODE_ENV: "production", E2E_DEV_SESSION: "true" }),
    ).toThrow(/E2E_DEV_SESSION/);
  });

  it.each([undefined, "test", "staging", ""])("throws when NODE_ENV is %s", (nodeEnv) => {
    expect(() =>
      isDevSessionEnabled({ ...dev, NODE_ENV: nodeEnv, E2E_DEV_SESSION: "true" }),
    ).toThrow(/NODE_ENV/);
  });

  it("throws without the dev bypass flag", () => {
    expect(() => isDevSessionEnabled({ NODE_ENV: "development", E2E_DEV_SESSION: "true" })).toThrow(
      /AUTH_DEV_BYPASS/,
    );
  });

  it("throws on Railway or with a WorkOS API key", () => {
    expect(() =>
      isDevSessionEnabled({ ...dev, E2E_DEV_SESSION: "true", RAILWAY_ENVIRONMENT: "production" }),
    ).toThrow(/RAILWAY_ENVIRONMENT/);
    expect(() =>
      isDevSessionEnabled({ ...dev, E2E_DEV_SESSION: "true", WORKOS_API_KEY: "sk_x" }),
    ).toThrow(/WORKOS_API_KEY/);
  });

  it("never puts a value in an error message", () => {
    try {
      isDevSessionEnabled({ ...dev, E2E_DEV_SESSION: "true", WORKOS_API_KEY: "sk_secret_value" });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain("sk_secret_value");
    }
  });
});

describe("dev session cookie", () => {
  const req = (cookie?: string) =>
    new Request("http://localhost/app", { headers: cookie ? { cookie } : {} });

  it("is recognised only when exactly set to 1", () => {
    expect(hasDevSessionCookie(req())).toBe(false);
    expect(hasDevSessionCookie(req(`${DEV_SESSION_COOKIE}=0`))).toBe(false);
    expect(hasDevSessionCookie(req(`x_${DEV_SESSION_COOKIE}=1`))).toBe(false);
    expect(hasDevSessionCookie(req(`a=b; ${DEV_SESSION_COOKIE}=1`))).toBe(true);
  });

  it("is HttpOnly and cleared with Max-Age=0", () => {
    expect(devSessionSetCookie).toContain("HttpOnly");
    expect(devSessionClearCookie).toContain("Max-Age=0");
  });
});
