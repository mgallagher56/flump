import {
  type ExecutionContext,
  ForbiddenException,
  GoneException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AllowUninvited } from "./allow-uninvited";
import { AuthGuard } from "./auth.guard";
import { DEV_BYPASS_TOKEN, DevBypassVerifier } from "./dev-bypass.verifier";
import { AllowErasedAccount } from "./erased-account";
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
    /** A local run with no beta variables; each case sets what it needs. */
    const local = () => {
      process.env = { ...original, NODE_ENV: "test" };
      for (const name of [
        "BETA_ALLOWED_EMAILS",
        "BETA_ALLOWED_USER_IDS",
        "BETA_ADMIN_USER_IDS",
        "BETA_OPEN",
        "RAILWAY_ENVIRONMENT",
      ]) {
        delete process.env[name];
      }
    };

    const verifierFor = (user: { id: string; email?: string }): TokenVerifier => ({
      verify: async () => user,
    });
    const members = new Set<string>();
    const lookups: string[] = [];
    const membership = {
      isActiveMember: async (id: string) => {
        lookups.push(id);
        return members.has(id);
      },
    };
    const withHandler = (handler: () => void): ExecutionContext =>
      ({
        switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: "Bearer x" } }) }),
        getHandler: () => handler,
      }) as unknown as ExecutionContext;
    const run = (user: { id: string; email?: string }, handler: () => void = () => {}) =>
      new AuthGuard(verifierFor(user), undefined, undefined, membership).canActivate(
        withHandler(handler),
      );
    const refusal = async (promise: Promise<unknown>) => {
      const err: unknown = await promise.catch((e) => e);
      if (!(err instanceof ForbiddenException)) throw new Error("expected a ForbiddenException");
      // The body is exactly what it was before invite links.
      expect(err.getResponse()).toEqual({
        statusCode: 403,
        error: "not_invited",
        message: "This account has not been invited to the Flump beta.",
      });
    };

    it("does not restrict anyone on a local run with no allowlist and no admin", async () => {
      local();
      lookups.length = 0;
      await expect(run({ id: "anyone" })).resolves.toBe(true);
      expect(lookups).toEqual([]);
    });

    it("lets listed emails and ids in and refuses everyone else with not_invited", async () => {
      local();
      process.env.BETA_ALLOWED_EMAILS = "Owner@Example.com";
      process.env.BETA_ALLOWED_USER_IDS = "user_friend";
      await expect(run({ id: "u1", email: "owner@example.com" })).resolves.toBe(true);
      await expect(run({ id: "user_friend" })).resolves.toBe(true);
      await refusal(run({ id: "stranger", email: "x@y.com" }));
      await refusal(run({ id: "no-email" }));
    });

    it("an admin list alone makes the beta invite-only: admins and active members pass", async () => {
      local();
      process.env.BETA_ADMIN_USER_IDS = "user_admin";
      members.clear();
      members.add("user_member");
      await expect(run({ id: "user_admin" })).resolves.toBe(true);
      await expect(run({ id: "user_member" })).resolves.toBe(true);
      await refusal(run({ id: "user_stranger" }));
      // Removal is read on the very next request (no cache).
      members.delete("user_member");
      await refusal(run({ id: "user_member" }));
    });

    it("a production-like process with no variables is invite-only (fail closed)", async () => {
      local();
      process.env.RAILWAY_ENVIRONMENT = "staging";
      members.clear();
      await refusal(run({ id: "anyone" }));
      process.env.BETA_OPEN = "true";
      await expect(run({ id: "anyone" })).resolves.toBe(true);
    });

    it("treats nobody as a member when the membership check cannot be resolved", async () => {
      local();
      process.env.BETA_ADMIN_USER_IDS = "user_admin";
      const guard = new AuthGuard(verifierFor({ id: "user_member" }));
      await refusal(guard.canActivate(withHandler(() => {})));
    });

    it("lets an uninvited caller through only on a handler marked AllowUninvited", async () => {
      local();
      process.env.BETA_ADMIN_USER_IDS = "user_admin";
      members.clear();
      class Probe {
        @AllowUninvited()
        redeem() {}
        other() {}
      }
      await expect(run({ id: "user_new" }, Probe.prototype.redeem)).resolves.toBe(true);
      await refusal(run({ id: "user_new" }, Probe.prototype.other));
    });
  });
});

describe("AuthGuard erased-account check (BE-04)", () => {
  const erased = new Set(["dev_user_123"]);
  const check = { isErased: async (id: string) => erased.has(id) };
  const request = () => ({ headers: { authorization: `Bearer ${DEV_BYPASS_TOKEN}` } }) as Req;
  const withHandler = (req: Req, handler: () => void): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => handler,
    }) as unknown as ExecutionContext;

  it("refuses an erased account's valid token with 410 account_deleted (not 401)", async () => {
    const guard = new AuthGuard(new DevBypassVerifier(), undefined, check);
    const err = await guard.canActivate(withHandler(request(), () => {})).catch((e) => e);
    expect(err).toBeInstanceOf(GoneException);
    expect(err.getResponse()).toEqual({
      statusCode: 410,
      error: "account_deleted",
      message: "This account has been deleted.",
    });
  });

  it("lets the erased account through only on a handler marked AllowErasedAccount", async () => {
    const guard = new AuthGuard(new DevBypassVerifier(), undefined, check);
    class Probe {
      @AllowErasedAccount()
      retryDelete() {}
    }
    await expect(
      guard.canActivate(withHandler(request(), Probe.prototype.retryDelete)),
    ).resolves.toBe(true);
  });

  it("AllowUninvited does not exempt an erased account (it can never redeem an invite)", async () => {
    const guard = new AuthGuard(new DevBypassVerifier(), undefined, check);
    class Probe {
      @AllowUninvited()
      redeem() {}
    }
    await expect(guard.canActivate(withHandler(request(), Probe.prototype.redeem))).rejects.toThrow(
      GoneException,
    );
  });

  describe("while the beta is invite-only and the caller is not (or no longer) allowed", () => {
    // Erasure deletes an invited person's membership row, so a retried deletion arrives uninvited.
    let before: string | undefined;
    beforeEach(() => {
      before = process.env.BETA_ALLOWED_USER_IDS;
      process.env.BETA_ALLOWED_USER_IDS = "user_someone_else";
    });
    afterEach(() => {
      if (before === undefined) delete process.env.BETA_ALLOWED_USER_IDS;
      else process.env.BETA_ALLOWED_USER_IDS = before;
    });
    class Probe {
      @AllowErasedAccount()
      retryDelete() {}
      other() {}
    }

    it("still lets an erased account retry its deletion", async () => {
      const guard = new AuthGuard(new DevBypassVerifier(), undefined, check);
      await expect(
        guard.canActivate(withHandler(request(), Probe.prototype.retryDelete)),
      ).resolves.toBe(true);
    });

    it("answers 410 account_deleted elsewhere, not 403 not_invited", async () => {
      const guard = new AuthGuard(new DevBypassVerifier(), undefined, check);
      await expect(
        guard.canActivate(withHandler(request(), Probe.prototype.other)),
      ).rejects.toThrow(GoneException);
    });

    it("AllowErasedAccount alone does not exempt a caller who is neither erased nor invited", async () => {
      const guard = new AuthGuard(new DevBypassVerifier(), undefined, {
        isErased: async () => false,
      });
      const err = await guard
        .canActivate(withHandler(request(), Probe.prototype.retryDelete))
        .catch((e) => e);
      expect(err.getResponse()).toMatchObject({ statusCode: 403, error: "not_invited" });
    });
  });

  it("passes accounts that are not erased, and resolves the check lazily from the app", async () => {
    erased.clear();
    const moduleRef = { get: () => check };
    const guard = new AuthGuard(new DevBypassVerifier(), moduleRef as never);
    await expect(guard.canActivate(withHandler(request(), () => {}))).resolves.toBe(true);
    erased.add("dev_user_123");
    await expect(guard.canActivate(withHandler(request(), () => {}))).rejects.toThrow(
      GoneException,
    );
  });
});
