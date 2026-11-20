import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it } from "vitest";
import { describeException } from "../contract/api-exception.filter";
import { BetaAdminGuard } from "./beta-admin.guard";
import { hashInviteToken, newInviteToken } from "./invite-token";

const ADMIN = ["user", "admin"].join("_");
const OTHER = ["user", "other"].join("_");

describe("BetaAdminGuard", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });
  const ctx = (userId: string | undefined, method = "GET", originalUrl = "/beta/admin") =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ method, originalUrl, url: originalUrl, user: { id: userId } }),
      }),
    }) as never;

  it("lets an admin through", () => {
    process.env.BETA_ADMIN_USER_IDS = ` ${ADMIN} , user_two`;
    expect(new BetaAdminGuard().canActivate(ctx(ADMIN))).toBe(true);
  });

  it("answers anyone else, or every caller with no admins set, as an unknown route", () => {
    process.env.BETA_ADMIN_USER_IDS = ADMIN;
    const refuse = (userId: string | undefined, method?: string, url?: string) => {
      try {
        new BetaAdminGuard().canActivate(ctx(userId, method, url));
      } catch (err) {
        return err as NotFoundException;
      }
      throw new Error("expected a refusal");
    };
    const err = refuse(OTHER, "DELETE", "/v1/beta/admin/members/x");
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.getResponse()).toEqual({
      message: "Cannot DELETE /v1/beta/admin/members/x",
      error: "Not Found",
      statusCode: 404,
    });
    expect(describeException(err)).toEqual(
      describeException(new NotFoundException("Cannot GET /no-such-route")),
    );
    expect(refuse(undefined)).toBeInstanceOf(NotFoundException);
    delete process.env.BETA_ADMIN_USER_IDS;
    expect(refuse(ADMIN)).toBeInstanceOf(NotFoundException);
  });
});

describe("invite tokens", () => {
  it("are 43 base64url characters (32 bytes) and differ every time", () => {
    const a = newInviteToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newInviteToken()).not.toBe(a);
  });

  it("are stored as their SHA-256 hex", () => {
    // SHA-256("abc"), the FIPS 180-2 test vector.
    expect(hashInviteToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
