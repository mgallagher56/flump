import { describe, expect, it } from "vitest";
import { isBetaInviteOnly, isBetaUserAllowedByEnv, isBetaUserIdAllowed } from "./beta-access";
import { isProductionLike } from "./mcp-access";

describe("isBetaInviteOnly: the one open-or-invite-only rule", () => {
  it("is open only on a local run with nothing set, or with BETA_OPEN=true and no allowlist", () => {
    expect(isBetaInviteOnly({ NODE_ENV: "test" })).toBe(false);
    expect(isBetaInviteOnly({ NODE_ENV: "development" })).toBe(false);
    expect(isBetaInviteOnly({ NODE_ENV: "production", BETA_OPEN: "true" })).toBe(false);
  });

  it("a Railway process with nothing set is never in the local open branch", () => {
    // Every variable isProductionLike reads, with NODE_ENV not saying production.
    for (const NODE_ENV of ["development", "test", undefined]) {
      const env = { NODE_ENV, RAILWAY_ENVIRONMENT: "staging" };
      expect(isProductionLike(env)).toBe(true);
      expect(isBetaInviteOnly(env)).toBe(true);
      expect(isBetaUserAllowedByEnv(env, { id: "user_anyone" })).toBe(false);
    }
  });

  it("an admin list or an env allowlist makes it invite-only", () => {
    expect(isBetaInviteOnly({ NODE_ENV: "test", BETA_ADMIN_USER_IDS: "user_admin" })).toBe(true);
    expect(isBetaInviteOnly({ NODE_ENV: "test", BETA_ALLOWED_USER_IDS: "user_a" })).toBe(true);
    expect(isBetaInviteOnly({ BETA_ALLOWED_EMAILS: "a@b.c", BETA_OPEN: "true" })).toBe(true);
  });

  it("by user id: admin, id list or member; an email list alone refuses (fail closed)", async () => {
    const none = { isActiveMember: async () => false };
    const env = { BETA_ALLOWED_EMAILS: "a@b.c" };
    expect(await isBetaUserIdAllowed(env, "user_a", none)).toBe(false);
    expect(
      await isBetaUserIdAllowed({ ...env, BETA_ALLOWED_USER_IDS: "user_a" }, "user_a", none),
    ).toBe(true);
    expect(await isBetaUserIdAllowed({ BETA_ADMIN_USER_IDS: "user_a" }, "user_a", none)).toBe(true);
    const member = { isActiveMember: async (id: string) => id === "user_m" };
    expect(await isBetaUserIdAllowed({ BETA_ADMIN_USER_IDS: "x" }, "user_m", member)).toBe(true);
    expect(await isBetaUserIdAllowed({ BETA_ADMIN_USER_IDS: "x" }, "user_m", null)).toBe(false);
  });
});

describe("isBetaUserAllowedByEnv (closed beta, E19 A7)", () => {
  // WorkOS user ids carry upper-case letters (for example `user_01H...`), so a sample id is
  // built the same way at runtime.
  const workosId = `user_01${"H".repeat(4)}${"X".repeat(20)}`;

  it("matches a listed WorkOS user id exactly, upper-case letters included", () => {
    // The id list is not case-folded: the token's `sub` is compared as written.
    expect(isBetaUserAllowedByEnv({ BETA_ALLOWED_USER_IDS: workosId }, { id: workosId })).toBe(
      true,
    );
  });

  it("reads comma-separated emails with spaces after the commas", () => {
    // "a@x.example, owner@example.com" lists two emails; the space is not part of the second.
    const env = { BETA_ALLOWED_EMAILS: "a@x.example, owner@example.com" };
    expect(isBetaUserAllowedByEnv(env, { id: "u1", email: "owner@example.com" })).toBe(true);
    expect(isBetaUserAllowedByEnv(env, { id: "u2", email: "stranger@example.com" })).toBe(false);
  });
});
