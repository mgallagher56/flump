// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  applySessionPolicy,
  legacySessionCookieClear,
  sessionCookieClear,
} from "./sessionPolicy.server";

describe("applySessionPolicy outside production", () => {
  it("keeps a configured max age without the production limit", () => {
    // 30 days is above the 14-day production limit; development may use it.
    const env: Record<string, string | undefined> = {
      NODE_ENV: "development",
      WORKOS_COOKIE_MAX_AGE: "2592000",
    };
    expect(() => applySessionPolicy(env)).not.toThrow();
    expect(env.WORKOS_COOKIE_MAX_AGE).toBe("2592000");
  });
});

describe("session cookie names that are only spaces", () => {
  it("production treats a blank cookie name as unset and uses the __Host- name", () => {
    const env: Record<string, string | undefined> = {
      NODE_ENV: "production",
      WORKOS_REDIRECT_URI: "https://app.example.test/callback",
      WORKOS_COOKIE_NAME: "   ",
    };
    applySessionPolicy(env);
    expect(env.WORKOS_COOKIE_NAME).toBe("__Host-wos-session");
  });

  it("legacy clear is not needed when the blank name falls back to wos-session", () => {
    expect(legacySessionCookieClear({ NODE_ENV: "production", WORKOS_COOKIE_NAME: "   " })).toBe(
      null,
    );
  });

  it("logout clears the default cookie when the configured name is blank", () => {
    expect(sessionCookieClear({ NODE_ENV: "production", WORKOS_COOKIE_NAME: "   " })).toBe(
      "__Host-wos-session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
    );
  });
});
