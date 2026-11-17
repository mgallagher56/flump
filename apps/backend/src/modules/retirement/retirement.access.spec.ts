import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { describeException } from "../../contract/api-exception.filter";
import {
  isRetirementAllowed,
  RETIREMENT_TOOL_NAMES,
  RetirementAccessGuard,
} from "./retirement.access";

describe("isRetirementAllowed (RD9 friends beta)", () => {
  it("allows everyone while the environment is in open testing", () => {
    expect(isRetirementAllowed({ BETA_OPEN: "true" }, "anyone")).toBe(true);
    expect(isRetirementAllowed({ BETA_OPEN: " TRUE " }, undefined)).toBe(true);
  });

  it("allows listed WorkOS user ids", () => {
    const env = { RETIREMENT_ALLOWED_USER_IDS: "user_a, user_b " };
    expect(isRetirementAllowed(env, "user_a")).toBe(true);
    expect(isRetirementAllowed(env, "user_b")).toBe(true);
  });

  it("refuses everyone else, including outside production", () => {
    expect(isRetirementAllowed({}, "user_a")).toBe(false);
    expect(isRetirementAllowed({ NODE_ENV: "development" }, "user_a")).toBe(false);
    expect(isRetirementAllowed({ BETA_OPEN: "false" }, "user_a")).toBe(false);
    expect(isRetirementAllowed({ RETIREMENT_ALLOWED_USER_IDS: "user_a" }, "user_c")).toBe(false);
    expect(isRetirementAllowed({ RETIREMENT_ALLOWED_USER_IDS: "user_a" }, undefined)).toBe(false);
  });

  it("never treats an empty list entry as a match", () => {
    expect(isRetirementAllowed({ RETIREMENT_ALLOWED_USER_IDS: " , ," }, "")).toBe(false);
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

  const refusal = (fn: () => unknown): NotFoundException => {
    try {
      fn();
    } catch (err) {
      return err as NotFoundException;
    }
    throw new Error("expected the guard to refuse");
  };

  it("lets a listed user through", () => {
    delete process.env.BETA_OPEN;
    process.env.RETIREMENT_ALLOWED_USER_IDS = FRIEND;
    expect(new RetirementAccessGuard().canActivate(ctx(FRIEND))).toBe(true);
  });

  it("lets anyone through in open testing", () => {
    process.env.BETA_OPEN = "true";
    delete process.env.RETIREMENT_ALLOWED_USER_IDS;
    expect(new RetirementAccessGuard().canActivate(ctx(STRANGER))).toBe(true);
  });

  it("answers exactly as Nest does for an unknown route, with the real method and path", () => {
    delete process.env.BETA_OPEN;
    process.env.RETIREMENT_ALLOWED_USER_IDS = FRIEND;
    const guard = new RetirementAccessGuard();

    const get = refusal(() => guard.canActivate(ctx(STRANGER)));
    expect(get).toBeInstanceOf(NotFoundException);
    expect(get.getResponse()).toEqual({
      message: "Cannot GET /retirement-plan",
      error: "Not Found",
      statusCode: 404,
    });

    const put = refusal(() => guard.canActivate(ctx(STRANGER, "PUT", "/v1/retirement-plan")));
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
