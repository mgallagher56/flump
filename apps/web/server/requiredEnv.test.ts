import { describe, expect, it } from "vitest";
import { assertProductionEnv, CLIENT_IP_KEY_ENV } from "./requiredEnv";

// Built at runtime: the repository is public, so no key-shaped literals.
const key = (length: number) => "k".repeat(length);

describe("assertProductionEnv (SEC-A)", () => {
  it("passes in production with a key of at least 32 characters", () => {
    expect(() =>
      assertProductionEnv({ NODE_ENV: "production", [CLIENT_IP_KEY_ENV]: key(32) }),
    ).not.toThrow();
  });

  it.each([undefined, "", "   "])("refuses production when the key is %j, naming it", (value) => {
    expect(() =>
      assertProductionEnv({ NODE_ENV: "production", [CLIENT_IP_KEY_ENV]: value }),
    ).toThrow("WEB_CLIENT_IP_HMAC_KEY is required in production.");
  });

  it("refuses a short key in production without printing it", () => {
    const short = key(31);
    let message = "";
    try {
      assertProductionEnv({ NODE_ENV: "production", [CLIENT_IP_KEY_ENV]: short });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe("WEB_CLIENT_IP_HMAC_KEY must be at least 32 characters.");
    expect(message).not.toContain(short);
  });

  it.each(["development", "test"])("leaves the key optional when NODE_ENV is %s", (mode) => {
    expect(() => assertProductionEnv({ NODE_ENV: mode })).not.toThrow();
    expect(() =>
      assertProductionEnv({ NODE_ENV: mode, [CLIENT_IP_KEY_ENV]: "short" }),
    ).not.toThrow();
  });
});
