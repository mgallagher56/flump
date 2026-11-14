import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { assertRecentLogin, RECENT_LOGIN_MAX_AGE_SECONDS } from "./recent-login";

const NOW_MS = Date.UTC(2026, 10, 14, 12, 0, 0);
const now = NOW_MS / 1000;

describe("assertRecentLogin", () => {
  it("passes when the person signed in within the window", () => {
    expect(() => assertRecentLogin({ authTime: now - 60 }, NOW_MS)).not.toThrow();
    expect(() =>
      assertRecentLogin({ authTime: now - RECENT_LOGIN_MAX_AGE_SECONDS }, NOW_MS),
    ).not.toThrow();
    // Small clock skew is tolerated.
    expect(() => assertRecentLogin({ authTime: now + 30 }, NOW_MS)).not.toThrow();
  });

  it.each([
    ["an old sign-in", { authTime: now - RECENT_LOGIN_MAX_AGE_SECONDS - 1 }],
    ["no auth_time claim", {}],
    ["no user", undefined],
    ["a far-future auth_time", { authTime: now + 3600 }],
    ["a non-finite auth_time", { authTime: Number.NaN }],
  ])("fails closed with 403 recent_login_required for %s", (_label, user) => {
    try {
      assertRecentLogin(user, NOW_MS);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        statusCode: 403,
        error: "recent_login_required",
      });
    }
  });
});
