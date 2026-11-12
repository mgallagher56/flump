import {
  type ExecutionContext,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { AuthGuard } from "./auth.guard";
import { DEV_BYPASS_TOKEN, DevBypassVerifier } from "./dev-bypass.verifier";
import { createTestJwks } from "./testing/test-jwks";
import type { TokenVerifier } from "./token-verifier";
import { WorkOsJwtVerifier } from "./workos-jwt.verifier";

type Req = { path?: string; headers: Record<string, string | undefined>; user?: unknown };

const ctx = (request: Req): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

describe("AuthGuard", () => {
  let guard: AuthGuard;
  let validToken: string;

  beforeAll(async () => {
    Logger.overrideLogger(false);
    const t = await createTestJwks();
    guard = new AuthGuard(new WorkOsJwtVerifier({ jwks: t.jwks, issuer: t.issuer }));
    validToken = await t.sign({ sub: "user_123", email: "a@b.com" });
  });

  it("sets request.user from a valid token", async () => {
    const request: Req = { headers: { authorization: `Bearer ${validToken}` } };
    await expect(guard.canActivate(ctx(request))).resolves.toBe(true);
    expect((request.user as { id: string }).id).toBe("user_123");
  });

  it("matches the scheme case-insensitively", async () => {
    const request: Req = { headers: { authorization: `bearer ${validToken}` } };
    await expect(guard.canActivate(ctx(request))).resolves.toBe(true);
    expect((request.user as { id: string }).id).toBe("user_123");
  });

  it.each([
    ["no header", undefined],
    ["Basic scheme", "Basic x"],
    ["empty token", "Bearer "],
    ["whitespace-only token", "bearer   "],
    ["10 KB header", `Bearer ${"a".repeat(10 * 1024)}`],
    ["extra token parts", "Bearer a b"],
  ])("rejects %s", async (_name, header) => {
    const request: Req = { headers: { authorization: header } };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });

  it("rejects the mock token under the workos verifier", async () => {
    const request: Req = { headers: { authorization: `Bearer ${DEV_BYPASS_TOKEN}` } };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("maps a non-HTTP verifier error to UnauthorizedException", async () => {
    const verifier: TokenVerifier = {
      verify: async () => {
        throw new Error("boom internal detail");
      },
    };
    const request: Req = { headers: { authorization: "Bearer x" } };
    const err = await new AuthGuard(verifier).canActivate(ctx(request)).catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(String(err.message)).not.toContain("boom");
  });

  it("leaves request.user undefined when the JWKS lookup fails", async () => {
    const failing = new WorkOsJwtVerifier({
      jwks: async () => {
        throw new Error("jwks down");
      },
      issuer: "https://x.example",
    });
    const request: Req = { headers: { authorization: `Bearer ${validToken}` } };
    await expect(new AuthGuard(failing).canActivate(ctx(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });

  it("authenticates the dev token as dev_user_123 with the dev verifier", async () => {
    const request: Req = { headers: { authorization: `Bearer ${DEV_BYPASS_TOKEN}` } };
    await expect(new AuthGuard(new DevBypassVerifier()).canActivate(ctx(request))).resolves.toBe(
      true,
    );
    expect((request.user as { id: string }).id).toBe("dev_user_123");
  });

  it("no longer bypasses auth for /bank-connections/callback", async () => {
    const request: Req = { path: "/bank-connections/callback", headers: {} };
    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe("closed beta allowlist", () => {
    const original = { ...process.env };
    afterEach(() => {
      process.env = { ...original };
    });

    const verifierFor = (user: { id: string; email?: string }): TokenVerifier => ({
      verify: async () => user,
    });
    const run = (user: { id: string; email?: string }) =>
      new AuthGuard(verifierFor(user)).canActivate(ctx({ headers: { authorization: "Bearer x" } }));

    it("does not restrict anyone when no allowlist is configured", async () => {
      delete process.env.BETA_ALLOWED_EMAILS;
      delete process.env.BETA_ALLOWED_USER_IDS;
      await expect(run({ id: "anyone" })).resolves.toBe(true);
    });

    it("lets listed emails and ids in and refuses everyone else with not_invited", async () => {
      process.env.BETA_ALLOWED_EMAILS = "Owner@Example.com";
      process.env.BETA_ALLOWED_USER_IDS = "user_friend";
      await expect(run({ id: "u1", email: "owner@example.com" })).resolves.toBe(true);
      await expect(run({ id: "user_friend" })).resolves.toBe(true);

      const err = await run({ id: "stranger", email: "x@y.com" }).catch((e) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(err.getResponse()).toMatchObject({ error: "not_invited" });
      await expect(run({ id: "no-email" })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
