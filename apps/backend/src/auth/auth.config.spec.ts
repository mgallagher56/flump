import { describe, expect, it } from "vitest";
import { resolveAuthMode } from "./auth.config";

describe("resolveAuthMode", () => {
  it("returns workos when WORKOS_CLIENT_ID is set", () => {
    expect(resolveAuthMode({ WORKOS_CLIENT_ID: "client_x" })).toBe("workos");
  });

  it("returns dev for explicit bypass in development", () => {
    expect(resolveAuthMode({ AUTH_DEV_BYPASS: "true", NODE_ENV: "development" })).toBe("dev");
  });

  it("throws on empty env, naming the variables but no values", () => {
    expect(() => resolveAuthMode({})).toThrowError(/WORKOS_CLIENT_ID/);
    expect(() => resolveAuthMode({})).toThrowError(/AUTH_DEV_BYPASS/);
  });

  it("throws when bypass is requested in production", () => {
    expect(() => resolveAuthMode({ AUTH_DEV_BYPASS: "true", NODE_ENV: "production" })).toThrow();
  });

  it("throws when bypass is requested on Railway", () => {
    expect(() =>
      resolveAuthMode({
        AUTH_DEV_BYPASS: "true",
        NODE_ENV: "development",
        RAILWAY_ENVIRONMENT: "production",
      }),
    ).toThrow(/RAILWAY_ENVIRONMENT/);
  });

  it("throws when bypass is requested alongside a WorkOS API key", () => {
    let message = "";
    try {
      resolveAuthMode({
        AUTH_DEV_BYPASS: "true",
        NODE_ENV: "development",
        WORKOS_API_KEY: "sk_live_x",
      });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).not.toBe("");
    expect(message).not.toContain("sk_live_x");
  });

  it("returns workos when bypass is false and client id is set", () => {
    expect(
      resolveAuthMode({
        AUTH_DEV_BYPASS: "false",
        WORKOS_CLIENT_ID: "client_x",
      }),
    ).toBe("workos");
  });
});
