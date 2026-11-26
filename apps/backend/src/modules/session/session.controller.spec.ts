import "reflect-metadata";
import { type INestApplication, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BETA_MEMBERSHIP_CHECK } from "../../auth/beta-access";
import { ERASED_ACCOUNT_CHECK } from "../../auth/erased-account";
import { TERMS_ACCEPTANCE_CHECK } from "../../auth/terms-acceptance";
import { createTestJwks } from "../../auth/testing/test-jwks";
import { TOKEN_VERIFIER } from "../../auth/token-verifier";
import { WorkOsJwtVerifier } from "../../auth/workos-jwt.verifier";
import { InMemoryIdentityAdapter, USER_IDENTITY_ADAPTER } from "../../identity/identity.adapter";
import { SessionController } from "./session.controller";

// Sample ids, built at runtime.
const sampleSession = (label: string) => ["session", label, "x".repeat(8)].join("_");
const CALLER = ["user", "caller"].join("_");
const OTHER = ["user", "other"].join("_");

const reqWith = (sessionId?: string) =>
  ({ user: { id: CALLER, ...(sessionId === undefined ? {} : { sessionId }) } }) as never;

describe("SessionController.signOut (direct)", () => {
  let identity: InMemoryIdentityAdapter;
  let controller: SessionController;

  beforeEach(() => {
    identity = new InMemoryIdentityAdapter();
    controller = new SessionController(identity);
  });

  afterEach(() => vi.restoreAllMocks());

  it("ends the session named by the verified token", async () => {
    await expect(controller.signOut(reqWith(sampleSession("own")))).resolves.toBeUndefined();
    expect(identity.revokedSessions).toEqual([sampleSession("own")]);
  });

  it("does nothing when the token names no session (absent or empty)", async () => {
    await controller.signOut(reqWith());
    await controller.signOut(reqWith(""));
    expect(identity.revokedSessions).toEqual([]);
  });

  it("answers the standard 503 body when WorkOS fails, and logs neither the id nor the body", async () => {
    const sid = sampleSession("down");
    identity.revokeFailure = Object.assign(new Error(`Upstream failed: body names ${sid}`), {
      status: 500,
    });
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const err = await controller.signOut(reqWith(sid)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect((err as ServiceUnavailableException).getStatus()).toBe(503);
    expect((err as ServiceUnavailableException).getResponse()).toEqual({
      code: "service_unavailable",
      message: "We could not sign you out everywhere. Please try again shortly.",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = String(warn.mock.calls[0]?.[0]);
    expect(logged).toBe("session sign-out failed: Error (Upstream failed) status=500");
    expect(logged).not.toContain(sid);
  });
});

/**
 * Over HTTP with the real AuthGuard and the real WorkOS verifier on a throwaway key, an
 * invite-only beta the caller is not on, and a caller who has not agreed to the terms: the route's
 * own exemptions are what let the sign-out through. No database.
 */
describe("POST /session/sign-out (HTTP, real guard)", { timeout: 15_000 }, () => {
  let app: INestApplication;
  let identity: InMemoryIdentityAdapter;
  let sign: (claims: object) => Promise<string>;
  const termsAgreed = vi.fn(async (_userId: string) => false);
  const savedAllowed = process.env.BETA_ALLOWED_USER_IDS;

  beforeAll(async () => {
    Logger.overrideLogger(false);
    // Invite-only, and only OTHER is on the list: the caller is not invited.
    process.env.BETA_ALLOWED_USER_IDS = OTHER;
    const jwt = await createTestJwks();
    sign = (claims) => jwt.sign(claims);
    identity = new InMemoryIdentityAdapter();
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        { provide: TOKEN_VERIFIER, useValue: new WorkOsJwtVerifier(jwt) },
        { provide: USER_IDENTITY_ADAPTER, useValue: identity },
        { provide: ERASED_ACCOUNT_CHECK, useValue: { isErased: async () => false } },
        { provide: BETA_MEMBERSHIP_CHECK, useValue: { isActiveMember: async () => false } },
        { provide: TERMS_ACCEPTANCE_CHECK, useValue: { hasAgreedToTermsInForce: termsAgreed } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (savedAllowed === undefined) delete process.env.BETA_ALLOWED_USER_IDS;
    else process.env.BETA_ALLOWED_USER_IDS = savedAllowed;
  });

  beforeEach(() => {
    identity.revokedSessions.length = 0;
    identity.revokeFailure = null;
    termsAgreed.mockClear();
  });

  const post = (token?: string) => {
    const req = request(app.getHttpServer()).post("/session/sign-out");
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };

  it("an uninvited caller who has not agreed to the terms reaches the revoke and gets an empty 204", async () => {
    const token = await sign({ sub: CALLER, sid: sampleSession("mine") });
    const res = await post(token);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect(identity.revokedSessions).toEqual([sampleSession("mine")]);
    // Exempt from the terms check: the guard never asked.
    expect(termsAgreed).not.toHaveBeenCalled();
  });

  it("ignores a session id in the body or the query: only the token's sid is ended", async () => {
    const token = await sign({ sub: CALLER, sid: sampleSession("mine") });
    const res = await post(token)
      .query({ sessionId: sampleSession("query") })
      .send({ sessionId: sampleSession("body"), sid: sampleSession("body") });
    expect(res.status).toBe(204);
    expect(identity.revokedSessions).toEqual([sampleSession("mine")]);
  });

  it("with no sid in the token, a body session id is still ignored and nothing is ended", async () => {
    const token = await sign({ sub: CALLER });
    const res = await post(token).send({ sessionId: sampleSession("body") });
    expect(res.status).toBe(204);
    expect(identity.revokedSessions).toEqual([]);
  });

  it("answers 503 with the standard body when WorkOS fails", async () => {
    identity.revokeFailure = new Error("WorkOS down");
    const res = await post(await sign({ sub: CALLER, sid: sampleSession("mine") }));
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ code: "service_unavailable" });
    expect(JSON.stringify(res.body)).not.toContain(sampleSession("mine"));
  });

  it("refuses with 401 and ends nothing without a valid token", async () => {
    expect((await post()).status).toBe(401);
    expect((await post("not-a-token")).status).toBe(401);
    expect(identity.revokedSessions).toEqual([]);
  });
});
