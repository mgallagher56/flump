import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { describeException } from "../../contract/api-exception.filter";
import { fakeBetaMembership } from "../../testing/fake-beta-membership";
import {
  isRetirementAllowed,
  isRetirementToolAvailable,
  RETIREMENT_TOOL_NAMES,
  RetirementAccessGuard,
} from "./retirement.access";

const nobody = fakeBetaMembership();

describe("isRetirementAllowed (RD9 friends beta)", () => {
  it("allows everyone while the environment is in open testing", async () => {
    expect(await isRetirementAllowed({ BETA_OPEN: "true" }, "anyone", nobody)).toBe(true);
    expect(await isRetirementAllowed({ BETA_OPEN: " TRUE " }, undefined, nobody)).toBe(true);
  });

  it("allows listed WorkOS user ids", async () => {
    const env = { RETIREMENT_ALLOWED_USER_IDS: "user_a, user_b " };
    expect(await isRetirementAllowed(env, "user_a", nobody)).toBe(true);
    expect(await isRetirementAllowed(env, "user_b", nobody)).toBe(true);
  });

  it("refuses everyone else, including outside production", async () => {
    expect(await isRetirementAllowed({}, "user_a", nobody)).toBe(false);
    expect(await isRetirementAllowed({ NODE_ENV: "development" }, "user_a", nobody)).toBe(false);
    expect(await isRetirementAllowed({ BETA_OPEN: "false" }, "user_a", nobody)).toBe(false);
    expect(
      await isRetirementAllowed({ RETIREMENT_ALLOWED_USER_IDS: "user_a" }, "user_c", nobody),
    ).toBe(false);
    expect(
      await isRetirementAllowed({ RETIREMENT_ALLOWED_USER_IDS: "user_a" }, undefined, nobody),
    ).toBe(false);
  });

  it("never treats an empty list entry as a match", async () => {
    expect(await isRetirementAllowed({ RETIREMENT_ALLOWED_USER_IDS: " , ," }, "", nobody)).toBe(
      false,
    );
  });

  it("allows admins and active members of an invite-only beta, and nobody else", async () => {
    const env = { BETA_ADMIN_USER_IDS: "user_admin" };
    const membership = fakeBetaMembership(["user_member"]);
    expect(await isRetirementAllowed(env, "user_admin", membership)).toBe(true);
    expect(await isRetirementAllowed(env, "user_member", membership)).toBe(true);
    expect(await isRetirementAllowed(env, "user_other", membership)).toBe(false);
    membership.members.delete("user_member");
    expect(await isRetirementAllowed(env, "user_member", membership)).toBe(false);
  });

  it("does not count membership while the beta is open (no invite-only gate)", async () => {
    // A local run with no beta variables is open; a stale member row grants nothing extra.
    const membership = fakeBetaMembership(["user_member"]);
    expect(await isRetirementAllowed({ NODE_ENV: "test" }, "user_member", membership)).toBe(false);
  });

  it("the MCP tool rule follows the same decisions synchronously", () => {
    const env = { BETA_ADMIN_USER_IDS: "user_admin" };
    const membership = fakeBetaMembership(["user_member"]);
    expect(isRetirementToolAvailable(env, "user_admin", membership)).toBe(true);
    expect(isRetirementToolAvailable(env, "user_member", membership)).toBe(true);
    expect(isRetirementToolAvailable(env, "user_other", membership)).toBe(false);
    expect(isRetirementToolAvailable({ BETA_OPEN: "true" }, "user_other", membership)).toBe(true);
  });

  it("names the two MCP retirement tools", () => {
    expect([...RETIREMENT_TOOL_NAMES].sort()).toEqual([
      "get_retirement_picture",
      "simulate_retirement",
    ]);
  });
});

// Sample user ids built at runtime, so no scanner reads them as literal credentials.
const FRIEND = `user_${"a".repeat(8)}`;
const STRANGER = `user_${"b".repeat(8)}`;

describe("RetirementAccessGuard", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  const ctx = (userId: string | undefined, method = "GET", originalUrl = "/retirement-plan") =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          originalUrl,
          url: originalUrl,
          user: userId ? { id: userId } : undefined,
        }),
      }),
    }) as never;

  const refusal = async (promise: Promise<unknown>): Promise<NotFoundException> => {
    try {
      await promise;
    } catch (err) {
      return err as NotFoundException;
    }
    throw new Error("expected the guard to refuse");
  };

  it("lets a listed user through", async () => {
    delete process.env.BETA_OPEN;
    process.env.RETIREMENT_ALLOWED_USER_IDS = FRIEND;
    await expect(new RetirementAccessGuard(nobody).canActivate(ctx(FRIEND))).resolves.toBe(true);
  });

  it("lets anyone through in open testing", async () => {
    process.env.BETA_OPEN = "true";
    delete process.env.RETIREMENT_ALLOWED_USER_IDS;
    await expect(new RetirementAccessGuard(nobody).canActivate(ctx(STRANGER))).resolves.toBe(true);
  });

  it("lets an active member of an invite-only beta through", async () => {
    delete process.env.BETA_OPEN;
    delete process.env.RETIREMENT_ALLOWED_USER_IDS;
    process.env.BETA_ADMIN_USER_IDS = FRIEND;
    const guard = new RetirementAccessGuard(fakeBetaMembership([STRANGER]));
    await expect(guard.canActivate(ctx(STRANGER))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(FRIEND))).resolves.toBe(true);
  });

  it("answers exactly as Nest does for an unknown route, with the real method and path", async () => {
    delete process.env.BETA_OPEN;
    delete process.env.BETA_ADMIN_USER_IDS;
    process.env.RETIREMENT_ALLOWED_USER_IDS = FRIEND;
    const guard = new RetirementAccessGuard(nobody);

    const get = await refusal(guard.canActivate(ctx(STRANGER)));
    expect(get).toBeInstanceOf(NotFoundException);
    expect(get.getResponse()).toEqual({
      message: "Cannot GET /retirement-plan",
      error: "Not Found",
      statusCode: 404,
    });

    const put = await refusal(guard.canActivate(ctx(STRANGER, "PUT", "/v1/retirement-plan")));
    expect(put.getResponse()).toEqual({
      message: "Cannot PUT /v1/retirement-plan",
      error: "Not Found",
      statusCode: 404,
    });

    // Through the global filter it is the same answer an unknown path gets.
    const unknown = new NotFoundException("Cannot GET /no-such-route");
    expect(describeException(get)).toEqual(describeException(unknown));
    expect(JSON.stringify(get.getResponse())).not.toMatch(/feature|disabled|retirement plan/i);
  });
});
