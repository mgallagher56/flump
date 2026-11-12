import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { BankConnectionsEnabledGuard, isBankConnectionAllowed } from "./bank-connections.access";

describe("isBankConnectionAllowed", () => {
  it("is off in production by default", () => {
    expect(isBankConnectionAllowed({ NODE_ENV: "production" }, "owner")).toBe(false);
  });

  it("is on outside production by default", () => {
    expect(isBankConnectionAllowed({ NODE_ENV: "development" }, "u")).toBe(true);
    expect(isBankConnectionAllowed({}, "u")).toBe(true);
  });

  it("allows only allowlisted user ids in production", () => {
    const env = { NODE_ENV: "production", BANK_CONNECTIONS_ALLOWED_USER_IDS: "owner, other " };
    expect(isBankConnectionAllowed(env, "owner")).toBe(true);
    expect(isBankConnectionAllowed(env, "other")).toBe(true);
    expect(isBankConnectionAllowed(env, "stranger")).toBe(false);
    expect(isBankConnectionAllowed(env, undefined)).toBe(false);
  });

  it("lets the allowlist override an explicit off, and the flag open it to everyone", () => {
    expect(
      isBankConnectionAllowed(
        { BANK_CONNECTIONS_ENABLED: "false", BANK_CONNECTIONS_ALLOWED_USER_IDS: "owner" },
        "owner",
      ),
    ).toBe(true);
    expect(isBankConnectionAllowed({ BANK_CONNECTIONS_ENABLED: "false" }, "u")).toBe(false);
    expect(
      isBankConnectionAllowed({ NODE_ENV: "production", BANK_CONNECTIONS_ENABLED: "true" }, "u"),
    ).toBe(true);
  });

  it("never treats an empty allowlist entry as a match", () => {
    expect(
      isBankConnectionAllowed(
        { NODE_ENV: "production", BANK_CONNECTIONS_ALLOWED_USER_IDS: "," },
        "",
      ),
    ).toBe(false);
  });
});

describe("BankConnectionsEnabledGuard", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  const ctx = (userId: string) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user: { id: userId } }) }) }) as never;

  it("answers 404 feature_disabled in production for non-allowlisted users", () => {
    process.env.NODE_ENV = "production";
    delete process.env.BANK_CONNECTIONS_ENABLED;
    process.env.BANK_CONNECTIONS_ALLOWED_USER_IDS = "owner";
    const guard = new BankConnectionsEnabledGuard();

    expect(guard.canActivate(ctx("owner"))).toBe(true);
    try {
      guard.canActivate(ctx("stranger"));
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundException);
      expect((err as NotFoundException).getResponse()).toMatchObject({ error: "feature_disabled" });
    }
  });
});
