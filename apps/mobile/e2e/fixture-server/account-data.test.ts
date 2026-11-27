/**
 * @jest-environment node
 *
 * The fixture server's account-data routes (E12 S9): the export as an attachment, the deletion
 * with its scenarios, `auth_time` in issued tokens, 410 after erasure, and a sign-in as a
 * different person for the re-authentication flow.
 */
import { createHash, randomBytes } from "node:crypto";
import { ErrorResponse } from "@flump/api-contract";
import { type FixtureServer, startFixtureServer } from "./server";
import { newSigningKey } from "./tokens";

const signingKey = newSigningKey();
const REDIRECT = "flump://auth/callback";
const CLIENT_ID = ["client", "e2e", randomBytes(4).toString("hex")].join("_");
const FIFTEEN_MINUTES = 15 * 60 * 1000;

let server: FixtureServer;
let clock: number;

beforeEach(async () => {
  clock = Date.UTC(2026, 10, 27, 12, 0, 0);
  server = await startFixtureServer({ port: 0, clientId: CLIENT_ID, now: () => clock, signingKey });
});

afterEach(async () => {
  await server.close();
});

const url = (path: string) => `${server.origin}${path}`;

async function signIn() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "s",
  });
  const auth = await fetch(url(`/user_management/authorize?${query}`), { redirect: "manual" });
  const code = new URL(auth.headers.get("location") ?? "").searchParams.get("code") ?? "";
  const res = await fetch(url("/user_management/authenticate"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
    }),
  });
  return (await res.json()) as { access_token: string; refresh_token: string };
}

async function refresh(token: string) {
  return fetch(url("/user_management/authenticate"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: token,
    }),
  });
}

const claims = (token: string) =>
  JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()) as Record<
    string,
    unknown
  >;

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const deleteAccount = (token: string, confirmation: unknown = "DELETE") =>
  fetch(url("/v1/user-profile"), {
    method: "DELETE",
    headers: { ...bearer(token), "content-type": "application/json" },
    body: JSON.stringify({ confirmation }),
  });

async function errorCode(res: Response) {
  return ErrorResponse.parse(await res.json()).code;
}

describe("auth_time", () => {
  it("is the sign-in time, in seconds, and a refresh carries it unchanged", async () => {
    const tokens = await signIn();
    const signedInAt = Math.floor(clock / 1000);
    expect(claims(tokens.access_token).auth_time).toBe(signedInAt);
    clock += 5 * 60 * 1000;
    const next = (await (await refresh(tokens.refresh_token)).json()) as { access_token: string };
    expect(claims(next.access_token).auth_time).toBe(signedInAt);
    expect(claims(next.access_token).iat).toBe(signedInAt + 300);
  });
});

describe("GET /v1/user-profile/export", () => {
  it("answers the file as an attachment with the backend's file name, for the bearer only", async () => {
    const tokens = await signIn();
    const res = await fetch(url("/v1/user-profile/export"), {
      headers: bearer(tokens.access_token),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="flump-export-2026-11-27.json"',
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as { profile: { email: string } };
    expect(typeof body.profile.email).toBe("string");
    expect(server.stats().exports).toBe(1);
    expect((await fetch(url("/v1/user-profile/export"))).status).toBe(401);
    expect(server.stats().exports).toBe(1);
  });

  it("is open to a person not invited or who has not agreed to the terms, as the backend", async () => {
    const tokens = await signIn();
    server.setScenario({ account: "not-invited", terms: "required" });
    const res = await fetch(url("/v1/user-profile/export"), {
      headers: bearer(tokens.access_token),
    });
    expect(res.status).toBe(200);
  });

  it("rate-limited answers 429", async () => {
    const tokens = await signIn();
    server.setScenario({ export: "rate-limited" });
    const res = await fetch(url("/v1/user-profile/export"), {
      headers: bearer(tokens.access_token),
    });
    expect(res.status).toBe(429);
    expect(await errorCode(res)).toBe("rate_limited");
  });
});

describe("DELETE /v1/user-profile", () => {
  it("ok: deleted; then every read is 410 account_deleted and the login is gone", async () => {
    const tokens = await signIn();
    const res = await deleteAccount(tokens.access_token);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "deleted" });
    expect(server.stats()).toEqual(expect.objectContaining({ deletions: 1, erased: true }));
    // The login is gone: its refresh token is refused.
    expect((await refresh(tokens.refresh_token)).status).toBe(400);
  });

  it("an erased account's reads answer 410, before not invited", async () => {
    const tokens = await signIn();
    server.setScenario({ deletion: "identity-pending" });
    expect(await (await deleteAccount(tokens.access_token)).json()).toEqual({
      status: "identity_pending",
    });
    server.setScenario({ account: "not-invited" });
    for (const path of ["/v1/user-profile", "/v1/accounts", "/v1/user-profile/export"]) {
      const res = await fetch(url(path), { headers: bearer(tokens.access_token) });
      expect([path, res.status]).toEqual([path, 410]);
      expect(await errorCode(res)).toBe("account_deleted");
    }
  });

  it("identity-pending: the first answer is identity_pending, and repeating finishes it", async () => {
    const tokens = await signIn();
    server.setScenario({ deletion: "identity-pending" });
    expect(await (await deleteAccount(tokens.access_token)).json()).toEqual({
      status: "identity_pending",
    });
    // The login still exists: the session keeps working for the repeat.
    expect(await (await deleteAccount(tokens.access_token)).json()).toEqual({ status: "deleted" });
    expect(server.stats().deletions).toBe(1);
  });

  it("recent-login: 403 recent_login_required until the person signs in again", async () => {
    const tokens = await signIn();
    server.setScenario({ deletion: "recent-login" });
    const refused = await deleteAccount(tokens.access_token);
    expect(refused.status).toBe(403);
    expect(await errorCode(refused)).toBe("recent_login_required");
    expect(server.stats().erased).toBe(false);
    clock += 1000;
    const again = await signIn();
    expect((await deleteAccount(again.access_token)).status).toBe(200);
  });

  it("a sign-in more than 15 minutes old is refused, at any scenario", async () => {
    const tokens = await signIn();
    clock += FIFTEEN_MINUTES + 1000;
    const next = (await (await refresh(tokens.refresh_token)).json()) as { access_token: string };
    const res = await deleteAccount(next.access_token);
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe("recent_login_required");
  });

  it.each([
    ["unavailable", 503, "account_deletion_unavailable"],
    ["rate-limited", 429, "rate_limited"],
  ] as const)("%s answers %i %s and erases nothing", async (deletion, status, code) => {
    const tokens = await signIn();
    server.setScenario({ deletion });
    const res = await deleteAccount(tokens.access_token);
    expect(res.status).toBe(status);
    expect(await errorCode(res)).toBe(code);
    expect(server.stats().erased).toBe(false);
  });

  it("refuses a wrong phrase with 400, and an unsigned request with 401", async () => {
    const tokens = await signIn();
    expect((await deleteAccount(tokens.access_token, "delete")).status).toBe(400);
    expect((await fetch(url("/v1/user-profile"), { method: "DELETE" })).status).toBe(401);
    expect(server.stats().erased).toBe(false);
  });
});

describe("signing in as a different person", () => {
  it("signInAs other issues tokens for another user id", async () => {
    const first = await signIn();
    server.setScenario({ signInAs: "other" });
    const second = await signIn();
    expect(claims(second.access_token).sub).not.toBe(claims(first.access_token).sub);
    expect(String(claims(second.access_token).sub)).toMatch(/^user_/);
  });
});
