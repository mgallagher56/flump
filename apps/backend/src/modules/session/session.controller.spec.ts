import "reflect-metadata";
import { type INestApplication, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BETA_MEMBERSHIP_CHECK } from "../../auth/beta-access";
import { ERASED_ACCOUNT_CHECK } from "../../auth/erased-account";
import { TERMS_ACCEPTANCE_CHECK } from "../../auth/terms-acceptance";
import { createTestJwks } from "../../auth/testing/test-jwks";
import { TOKEN_VERIFIER } from "../../auth/token-verifier";
import { WorkOsJwtVerifier } from "../../auth/workos-jwt.verifier";
import { ApiExceptionFilter } from "../../contract/api-exception.filter";
import {
  InMemoryIdentityAdapter,
  USER_IDENTITY_ADAPTER,
  WorkOSIdentityAdapter,
} from "../../identity/identity.adapter";
import {
  FAIL_CLOSED_RATE_LIMIT_CLASSES,
  RATE_LIMIT_CLASS,
  RATE_LIMIT_POLICIES,
  SHARED_RATE_LIMIT_CLASSES,
} from "../../security/rate-limit.decorator";
import { SessionController } from "./session.controller";

// Sample ids and keys, built at runtime.
const sampleSession = (label: string) => ["session", label, "x".repeat(8)].join("_");
const CALLER = ["user", "caller"].join("_");
const OTHER = ["user", "other"].join("_");
const placeholderKey = ["sk", "test", "placeholder"].join("_");
const SAFE_REQUEST_ID = ["req", "signout", "1"].join("-");
const UNAVAILABLE_MESSAGE = "We could not sign you out everywhere. Please try again shortly.";

const reqWith = (sessionId?: string) =>
  ({ user: { id: CALLER, ...(sessionId === undefined ? {} : { sessionId }) } }) as never;

/** A DataSource whose transaction hands the audit helper a manager that records each insert. */
function fakeDataSource() {
  const inserts: Array<Record<string, unknown>> = [];
  const insert = vi.fn(async (row: Record<string, unknown>) => {
    inserts.push(row);
  });
  const manager = { getRepository: () => ({ insert }) };
  const transaction = vi.fn(async (work: (m: typeof manager) => Promise<unknown>) => work(manager));
  return { dataSource: { transaction } as unknown as DataSource, inserts, insert, transaction };
}

describe("SessionController.signOut (direct)", () => {
  let identity: InMemoryIdentityAdapter;
  let db: ReturnType<typeof fakeDataSource>;
  let controller: SessionController;

  beforeEach(() => {
    identity = new InMemoryIdentityAdapter();
    db = fakeDataSource();
    controller = new SessionController(identity, db.dataSource);
  });

  afterEach(() => vi.restoreAllMocks());

  it("ends the session named by the verified token and records one audit row with no session id", async () => {
    await expect(controller.signOut(reqWith(sampleSession("own")))).resolves.toBeUndefined();
    expect(identity.revokedSessions).toEqual([sampleSession("own")]);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.inserts).toEqual([
      {
        userId: CALLER,
        action: "session.signed_out",
        actorType: "user",
        targetId: null,
        requestId: null,
        metadata: {},
      },
    ]);
    expect(JSON.stringify(db.inserts)).not.toContain(sampleSession("own"));
  });

  it("does nothing and records nothing when the token names no session (absent or empty)", async () => {
    await controller.signOut(reqWith());
    await controller.signOut(reqWith(""));
    expect(identity.revokedSessions).toEqual([]);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("answers the standard 503 body when WorkOS fails, logs neither the id nor the body, and records nothing", async () => {
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
      message: UNAVAILABLE_MESSAGE,
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const logged = String(warn.mock.calls[0]?.[0]);
    expect(logged).toBe("session sign-out failed: Error (Upstream failed) status=500");
    expect(logged).not.toContain(sid);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("answers 503 when the audit row cannot be written, after the session was ended", async () => {
    db.insert.mockRejectedValueOnce(new Error("db down: detail"));
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const err = await controller.signOut(reqWith(sampleSession("own"))).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect((err as ServiceUnavailableException).getResponse()).toEqual({
      code: "service_unavailable",
      message: UNAVAILABLE_MESSAGE,
    });
    expect(identity.revokedSessions).toEqual([sampleSession("own")]);
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      "session sign-out audit failed: Error (db down)",
    ]);
  });

  it("is in the strict sessionSignOut class: ten an hour, shared store, failing open", () => {
    expect(Reflect.getMetadata(RATE_LIMIT_CLASS, SessionController.prototype.signOut)).toBe(
      "sessionSignOut",
    );
    expect(RATE_LIMIT_POLICIES.sessionSignOut).toEqual([{ limit: 10, windowMs: 3_600_000 }]);
    expect(SHARED_RATE_LIMIT_CLASSES.has("sessionSignOut")).toBe(true);
    expect(FAIL_CLOSED_RATE_LIMIT_CLASSES.has("sessionSignOut")).toBe(false);
  });
});

/**
 * Over HTTP with the real AuthGuard, the real WorkOS verifier on a throwaway key, the real WorkOS
 * adapter (its client call stubbed), the real exception filter, an invite-only beta the caller is
 * not on, and a caller who has not agreed to the terms: the route's own exemptions are what let
 * the sign-out through. No database.
 */
describe("POST /session/sign-out (HTTP, real guard)", { timeout: 15_000 }, () => {
  let app: INestApplication;
  let sign: (claims: object, opts?: { expiresIn?: string }) => Promise<string>;
  let db: ReturnType<typeof fakeDataSource>;
  const revoke = vi.fn<(payload: { sessionId: string }) => Promise<void>>();
  const termsAgreed = vi.fn(async (_userId: string) => false);
  const erased = vi.fn(async (_userId: string) => false);
  const savedAllowed = process.env.BETA_ALLOWED_USER_IDS;

  const revoked = () => revoke.mock.calls.map(([payload]) => payload.sessionId);

  beforeAll(async () => {
    Logger.overrideLogger(false);
    // Invite-only, and only OTHER is on the list: the caller is not invited.
    process.env.BETA_ALLOWED_USER_IDS = OTHER;
    const jwt = await createTestJwks();
    sign = (claims, opts) => jwt.sign(claims, opts);
    const identity = new WorkOSIdentityAdapter(
      new ConfigService({ WORKOS_API_KEY: placeholderKey }),
    );
    (
      identity as unknown as { client: { userManagement: { revokeSession: unknown } } }
    ).client.userManagement.revokeSession = revoke;
    db = fakeDataSource();
    const moduleRef = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        { provide: TOKEN_VERIFIER, useValue: new WorkOsJwtVerifier(jwt) },
        { provide: USER_IDENTITY_ADAPTER, useValue: identity },
        { provide: DataSource, useValue: db.dataSource },
        { provide: ERASED_ACCOUNT_CHECK, useValue: { isErased: erased } },
        { provide: BETA_MEMBERSHIP_CHECK, useValue: { isActiveMember: async () => false } },
        { provide: TERMS_ACCEPTANCE_CHECK, useValue: { hasAgreedToTermsInForce: termsAgreed } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (savedAllowed === undefined) delete process.env.BETA_ALLOWED_USER_IDS;
    else process.env.BETA_ALLOWED_USER_IDS = savedAllowed;
  });

  beforeEach(() => {
    revoke.mockReset();
    revoke.mockResolvedValue(undefined);
    termsAgreed.mockClear();
    erased.mockReset();
    erased.mockResolvedValue(false);
    db.inserts.length = 0;
  });

  const post = (token?: string) => {
    const req = request(app.getHttpServer())
      .post("/session/sign-out")
      .set("x-request-id", SAFE_REQUEST_ID);
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };

  it("an uninvited caller who has not agreed to the terms reaches the revoke and gets an empty 204", async () => {
    const token = await sign({ sub: CALLER, sid: sampleSession("mine") });
    const res = await post(token);
    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect(revoked()).toEqual([sampleSession("mine")]);
    expect(db.inserts.map((row) => row.action)).toEqual(["session.signed_out"]);
    // Exempt from the terms check: the guard never asked.
    expect(termsAgreed).not.toHaveBeenCalled();
  });

  it("ignores a session or user named in the body, the query or a header: only the token's sid is ended", async () => {
    const token = await sign({ sub: CALLER, sid: sampleSession("mine") });
    const res = await post(token)
      .set("x-session-id", sampleSession("header"))
      .set("x-user-id", OTHER)
      .set("x-workos-session-id", sampleSession("header"))
      .query({ sessionId: sampleSession("query"), sid: sampleSession("query") })
      .send({ sessionId: sampleSession("body"), sid: sampleSession("body"), userId: OTHER });
    expect(res.status).toBe(204);
    expect(revoked()).toEqual([sampleSession("mine")]);
    expect(db.inserts.map((row) => row.userId)).toEqual([CALLER]);
  });

  it("with no sid in the token, a session named in the body, query or a header is still ignored and nothing is ended", async () => {
    const token = await sign({ sub: CALLER });
    const res = await post(token)
      .set("x-session-id", sampleSession("header"))
      .query({ sessionId: sampleSession("query") })
      .send({ sessionId: sampleSession("body") });
    expect(res.status).toBe(204);
    expect(revoke).not.toHaveBeenCalled();
    expect(db.inserts).toEqual([]);
  });

  it("a repeat for a session WorkOS no longer knows (404) answers the same empty 204", async () => {
    const token = await sign({ sub: CALLER, sid: sampleSession("mine") });
    expect((await post(token)).status).toBe(204);
    revoke.mockRejectedValueOnce(Object.assign(new Error("Not Found"), { status: 404 }));
    const again = await post(token);
    expect(again.status).toBe(204);
    expect(again.text).toBe("");
    expect(revoked()).toEqual([sampleSession("mine"), sampleSession("mine")]);
  });

  it("answers 503 with exactly the standard body, carrying no WorkOS detail, when WorkOS fails", async () => {
    revoke.mockRejectedValueOnce(
      Object.assign(new Error(`WorkOS 500: session ${sampleSession("mine")} internal trace`), {
        status: 500,
      }),
    );
    const res = await post(await sign({ sub: CALLER, sid: sampleSession("mine") }));
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      code: "service_unavailable",
      message: UNAVAILABLE_MESSAGE,
      requestId: SAFE_REQUEST_ID,
    });
    expect(db.inserts).toEqual([]);
  });

  it("an erased account gets the guard's usual 410 and nothing is ended", async () => {
    erased.mockResolvedValue(true);
    const res = await post(await sign({ sub: CALLER, sid: sampleSession("mine") }));
    expect(res.status).toBe(410);
    expect(res.body.code).toBe("account_deleted");
    expect(erased).toHaveBeenCalledWith(CALLER);
    expect(revoke).not.toHaveBeenCalled();
    expect(db.inserts).toEqual([]);
  });

  it("an expired token gets 401 and nothing is ended", async () => {
    const expired = await sign({ sub: CALLER, sid: sampleSession("mine") }, { expiresIn: "-1h" });
    const res = await post(expired);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("unauthorized");
    expect(revoke).not.toHaveBeenCalled();
    expect(db.inserts).toEqual([]);
  });

  it("refuses with 401 and ends nothing without a valid token", async () => {
    expect((await post()).status).toBe(401);
    expect((await post("not-a-token")).status).toBe(401);
    expect(revoke).not.toHaveBeenCalled();
  });
});
