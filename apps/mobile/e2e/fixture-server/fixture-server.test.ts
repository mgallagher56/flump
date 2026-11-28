/**
 * @jest-environment node
 */
import { createHash, createPublicKey, randomBytes, randomUUID, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createApiClient } from "@flump/api-client";
import {
  AccountDetailListResponse,
  AccountListResponse,
  ClientPolicyResponse,
  ErrorResponse,
  SnapshotCheckInsResponse,
  UpsertSnapshotResponse,
  UserProfileResponse,
} from "@flump/api-contract";
import { calculateCheckInBalance } from "@flump/finance-engine";
import { buildCheckInStore, checkInStepsFor } from "./fixtures";
import { EMULATOR_HOST, FIXTURE_PORT, type FixtureServer, startFixtureServer } from "./server";
import { newSigningKey } from "./tokens";

/** One key for the file: a fresh RSA key per test cost seconds of CI time. */
const signingKey = newSigningKey();

/** PKCE pair built at runtime (RFC 7636, S256). */
function pkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

const REDIRECT = "flump://auth/callback";
const CLIENT_ID = ["client", "e2e", randomBytes(4).toString("hex")].join("_");

let server: FixtureServer;
let clock: number;

beforeEach(async () => {
  clock = Date.UTC(2026, 10, 25, 12, 0, 0);
  server = await startFixtureServer({
    port: 0,
    clientId: CLIENT_ID,
    now: () => clock,
    signingKey,
  });
});

afterEach(async () => {
  await server.close();
});

const url = (path: string) => `${server.origin}${path}`;

async function authorize(challenge: string, state: string, extra: Record<string, string> = {}) {
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    provider: "authkit",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    ...extra,
  });
  return fetch(url(`/user_management/authorize?${query}`), { redirect: "manual" });
}

async function authenticate(body: Record<string, string>) {
  return fetch(url("/user_management/authenticate"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, ...body }),
  });
}

/** Signs in through the stand-in and returns the token pair. */
async function signIn() {
  const { verifier, challenge } = pkcePair();
  const res = await authorize(challenge, "state-1");
  const code = new URL(res.headers.get("location") ?? "").searchParams.get("code") ?? "";
  const tokens = await authenticate({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
  });
  const json = (await tokens.json()) as { access_token: string; refresh_token: string };
  return json;
}

function getProfile(token?: string) {
  return fetch(url("/v1/user-profile"), {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("canned /v1", () => {
  it("serves the client policy in the contract's shape, without a token", async () => {
    const res = await fetch(url("/v1/app/client-policy"));
    expect(res.status).toBe(200);
    const body = ClientPolicyResponse.parse(await res.json());
    expect(body.android.minVersion).toBe("0.0.0");
  });

  it("refuses the profile without a token, with the one error body", async () => {
    const res = await getProfile();
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string; requestId: string };
    expect(body.code).toBe("unauthorized");
    expect(body.requestId).toBe(res.headers.get("x-request-id"));
  });

  it("serves the profile in the contract's shape to a signed-in person", async () => {
    const { access_token } = await signIn();
    const res = await getProfile(access_token);
    expect(res.status).toBe(200);
    const profile = UserProfileResponse.parse(await res.json());
    expect(profile.firstName).toBe("Sam");
  });

  it("serves a person who has not finished setup, or has no profile yet, by scenario", async () => {
    const { access_token } = await signIn();
    server.setScenario({ profile: "not-set-up" });
    const notSetUp = await getProfile(access_token);
    expect(UserProfileResponse.parse(await notSetUp.json()).onboardingCompleted).toBe(false);
    server.setScenario({ profile: "none" });
    const none = await getProfile(access_token);
    expect([none.status, await none.text()]).toEqual([200, ""]);
  });

  it("answers an unknown /v1 route with 404, not a canned body", async () => {
    const { access_token } = await signIn();
    const res = await fetch(url("/v1/goals"), {
      headers: { authorization: `Bearer ${access_token}` },
    });
    expect(res.status).toBe(404);
    expect(((await res.json()) as { code: string }).code).toBe("not_found");
  });

  it("rejects an access token once it has expired, and accepts it the second before", async () => {
    server.setScenario({ accessTokenSeconds: 60 });
    const { access_token } = await signIn();
    clock += 59_000;
    expect((await getProfile(access_token)).status).toBe(200);
    clock += 1_000;
    expect((await getProfile(access_token)).status).toBe(401);
  });

  it("refuses a token signed by another key", async () => {
    const { access_token } = await signIn();
    const [header, payload] = access_token.split(".");
    const forged = `${header}.${payload}.${randomBytes(256).toString("base64url")}`;
    expect((await getProfile(forged)).status).toBe(401);
  });

  it("refuses a person not on the beta list with 403 not_invited, which the API client reads as not-invited", async () => {
    server.setScenario({ account: "not-invited" });
    const { access_token } = await signIn();
    const client = createApiClient({ baseUrl: server.origin, getAccessToken: () => access_token });
    await expect(
      client.request("/user-profile", { schema: UserProfileResponse }),
    ).rejects.toMatchObject({ kind: "not-invited", status: 403 });
  });

  it("refuses a person who has not agreed to the terms with 403 terms_not_accepted (PR #939)", async () => {
    server.setScenario({ terms: "required" });
    const { access_token } = await signIn();
    const client = createApiClient({ baseUrl: server.origin, getAccessToken: () => access_token });
    await expect(
      client.request("/user-profile", { schema: UserProfileResponse }),
    ).rejects.toMatchObject({ kind: "forbidden", status: 403, code: "terms_not_accepted" });
    server.setScenario({ terms: "agreed" });
    await expect(
      client.request("/user-profile", { schema: UserProfileResponse }),
    ).resolves.toMatchObject({ email: expect.any(String) });
  });

  it("not invited comes before terms not agreed, as on the backend", async () => {
    server.setScenario({ account: "not-invited", terms: "required" });
    const { access_token } = await signIn();
    expect((await getProfile(access_token)).status).toBe(403);
    const client = createApiClient({ baseUrl: server.origin, getAccessToken: () => access_token });
    await expect(
      client.request("/user-profile", { schema: UserProfileResponse }),
    ).rejects.toMatchObject({ kind: "not-invited" });
  });
});

describe("WorkOS stand-in: authorize", () => {
  it("redirects to the app with a code and the same state", async () => {
    const res = await authorize(pkcePair().challenge, "abc123");
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get("location") ?? "");
    expect(`${location.protocol}//${location.host}${location.pathname}`).toBe(REDIRECT);
    expect(location.searchParams.get("state")).toBe("abc123");
    expect(location.searchParams.get("code")).toMatch(/^[A-Za-z0-9_-]{20,}$/);
  });

  it("refuses an unregistered redirect address without redirecting", async () => {
    const res = await authorize(pkcePair().challenge, "s", { redirect_uri: "flump://elsewhere" });
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
  });

  it("refuses another client id", async () => {
    const res = await authorize(pkcePair().challenge, "s", { client_id: "client_other" });
    expect(res.status).toBe(400);
  });

  it("refuses the plain PKCE method and a missing challenge", async () => {
    expect((await authorize("x".repeat(43), "s", { code_challenge_method: "plain" })).status).toBe(
      400,
    );
    expect((await authorize("", "s")).status).toBe(400);
  });

  it("refuses a missing state", async () => {
    expect((await authorize(pkcePair().challenge, "")).status).toBe(400);
  });

  it("sends the person back with access_denied when the sign-in scenario fails", async () => {
    server.setScenario({ signIn: "denied" });
    const res = await authorize(pkcePair().challenge, "s9");
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.searchParams.get("error")).toBe("access_denied");
    expect(location.searchParams.get("state")).toBe("s9");
    expect(location.searchParams.get("code")).toBeNull();
  });
});

describe("WorkOS stand-in: code exchange", () => {
  it("issues an RS256 access token the JWKS verifies, with the WorkOS claims", async () => {
    const { access_token, refresh_token } = await signIn();
    expect(refresh_token.length).toBeGreaterThanOrEqual(32);
    const [h, p, s] = access_token.split(".") as [string, string, string];
    const header = JSON.parse(Buffer.from(h, "base64url").toString()) as {
      alg: string;
      kid: string;
    };
    const payload = JSON.parse(Buffer.from(p, "base64url").toString()) as Record<string, unknown>;
    expect(header.alg).toBe("RS256");
    expect(payload.iss).toBe(`${server.publicOrigin}/user_management/${CLIENT_ID}`);
    expect(payload.client_id).toBe(CLIENT_ID);
    expect(payload.exp).toBe(clock / 1000 + 300);

    const jwks = (await (await fetch(url(`/sso/jwks/${CLIENT_ID}`))).json()) as {
      keys: Array<{ kid: string }>;
    };
    const jwk = jwks.keys.find((k) => k.kid === header.kid);
    expect(jwk).toMatchObject({ kty: "RSA", alg: "RS256", use: "sig" });
    const key = createPublicKey({ key: jwk as never, format: "jwk" });
    expect(verify("RSA-SHA256", Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"))).toBe(
      true,
    );
  });

  it("refuses a wrong code verifier", async () => {
    const { challenge } = pkcePair();
    const res = await authorize(challenge, "s");
    const code = new URL(res.headers.get("location") ?? "").searchParams.get("code") ?? "";
    const tokens = await authenticate({
      grant_type: "authorization_code",
      code,
      code_verifier: pkcePair().verifier,
    });
    expect(tokens.status).toBe(400);
    expect(((await tokens.json()) as { error: string }).error).toBe("invalid_grant");
  });

  it("accepts a code once only", async () => {
    const { verifier, challenge } = pkcePair();
    const res = await authorize(challenge, "s");
    const code = new URL(res.headers.get("location") ?? "").searchParams.get("code") ?? "";
    const body = { grant_type: "authorization_code", code, code_verifier: verifier };
    expect((await authenticate(body)).status).toBe(200);
    expect((await authenticate(body)).status).toBe(400);
  });

  it("refuses a code after ten minutes, and accepts it the second before", async () => {
    const first = pkcePair();
    const r1 = await authorize(first.challenge, "s");
    const c1 = new URL(r1.headers.get("location") ?? "").searchParams.get("code") ?? "";
    const second = pkcePair();
    const r2 = await authorize(second.challenge, "s");
    const c2 = new URL(r2.headers.get("location") ?? "").searchParams.get("code") ?? "";
    clock += 599_000;
    const ok = { grant_type: "authorization_code", code: c1, code_verifier: first.verifier };
    expect((await authenticate(ok)).status).toBe(200);
    clock += 1_000;
    const late = { grant_type: "authorization_code", code: c2, code_verifier: second.verifier };
    expect((await authenticate(late)).status).toBe(400);
  });

  it("refuses any request that carries a client secret: the app is a public client", async () => {
    const { verifier, challenge } = pkcePair();
    const res = await authorize(challenge, "s");
    const code = new URL(res.headers.get("location") ?? "").searchParams.get("code") ?? "";
    const tokens = await authenticate({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_secret: randomBytes(8).toString("hex"),
    });
    expect(tokens.status).toBe(400);
    expect(((await tokens.json()) as { error: string }).error).toBe("invalid_client");
  });

  it("accepts a form-encoded body as well as JSON", async () => {
    const { verifier, challenge } = pkcePair();
    const res = await authorize(challenge, "s");
    const code = new URL(res.headers.get("location") ?? "").searchParams.get("code") ?? "";
    const tokens = await fetch(url("/user_management/authenticate"), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
      }).toString(),
    });
    expect(tokens.status).toBe(200);
  });
});

describe("WorkOS stand-in: refresh", () => {
  const refresh = (token: string) =>
    authenticate({ grant_type: "refresh_token", refresh_token: token });

  it("replaces the refresh token on use; the old one replays the same pair for 30 seconds, then is refused", async () => {
    const first = await signIn();
    const res = await refresh(first.refresh_token);
    expect(res.status).toBe(200);
    const next = (await res.json()) as { access_token: string; refresh_token: string };
    expect(next.refresh_token).not.toBe(first.refresh_token);
    expect((await getProfile(next.access_token)).status).toBe(200);
    // 29.999 seconds later: inside the grace period, the same pair comes back.
    clock += 29_999;
    const replay = await refresh(first.refresh_token);
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(next);
    // At exactly 30 seconds the grace period is over.
    clock += 1;
    const late = await refresh(first.refresh_token);
    expect(late.status).toBe(400);
    expect(((await late.json()) as { error: string }).error).toBe("invalid_grant");
    // The replacement still works: no reuse detection ends the session.
    expect((await refresh(next.refresh_token)).status).toBe(200);
  });

  it("a revoked session's spent token is refused even inside the grace period", async () => {
    const first = await signIn();
    await refresh(first.refresh_token);
    await fetch(url("/__fixture/revoke"), { method: "POST" });
    expect((await refresh(first.refresh_token)).status).toBe(400);
  });

  it("rejects every refresh in the rejected scenario", async () => {
    const { refresh_token } = await signIn();
    server.setScenario({ refresh: "rejected" });
    const res = await refresh(refresh_token);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toBe("invalid_grant");
  });

  it("answers 503 in the unavailable scenario and keeps the refresh token usable", async () => {
    const { refresh_token } = await signIn();
    server.setScenario({ refresh: "unavailable" });
    expect((await refresh(refresh_token)).status).toBe(503);
    server.setScenario({ refresh: "ok" });
    expect((await refresh(refresh_token)).status).toBe(200);
  });

  it("counts refreshes, so a flow can assert one refresh for a burst of 401s", async () => {
    const { refresh_token } = await signIn();
    expect(server.stats().refreshes).toBe(0);
    await refresh(refresh_token);
    expect(server.stats()).toMatchObject({ refreshes: 1, exchanges: 1 });
  });
});

describe("control routes", () => {
  it("revoking ends every session: access tokens and refresh tokens stop working", async () => {
    const { access_token, refresh_token } = await signIn();
    const res = await fetch(url("/__fixture/revoke"), { method: "POST" });
    expect(res.status).toBe(204);
    expect((await getProfile(access_token)).status).toBe(401);
    expect((await authenticate({ grant_type: "refresh_token", refresh_token })).status).toBe(400);
  });

  it("sets the scenario over HTTP, so a Maestro flow can choose it", async () => {
    const res = await fetch(url("/__fixture/scenario"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ account: "not-invited" }),
    });
    expect(res.status).toBe(204);
    const { access_token } = await signIn();
    expect((await getProfile(access_token)).status).toBe(403);
  });

  it("refuses an unknown scenario value instead of ignoring it", async () => {
    const res = await fetch(url("/__fixture/scenario"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh: "sometimes" }),
    });
    expect(res.status).toBe(400);
  });

  it.each([
    ['{"constructor":1}'],
    ['{"toString":"x"}'],
    ['{"__proto__":{"account":"not-invited"}}'],
    ['["refresh"]'],
  ])("refuses an inherited or non-object scenario %s with 400", async (body) => {
    const res = await fetch(url("/__fixture/scenario"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    expect(res.status).toBe(400);
    const { access_token } = await signIn();
    expect((await getProfile(access_token)).status).toBe(200);
  });

  it("reset restores the default scenario and clears the counts", async () => {
    server.setScenario({ account: "not-invited" });
    await signIn();
    await fetch(url("/__fixture/reset"), { method: "POST" });
    expect(server.stats()).toMatchObject({ refreshes: 0, exchanges: 0 });
    const { access_token } = await signIn();
    expect((await getProfile(access_token)).status).toBe(200);
  });
});

describe("where it listens", () => {
  it("binds to loopback by default", () => {
    expect(new URL(server.origin).hostname).toBe("127.0.0.1");
  });

  it.each(["0.0.0.0", "::", "192.168.1.20"])("refuses to listen on %p", async (host) => {
    await expect(startFixtureServer({ port: 0, host, clientId: CLIENT_ID })).rejects.toThrow(
      "loopback",
    );
  });

  it("the e2e build profile points the app at the fixture server's emulator address", () => {
    const eas = JSON.parse(readFileSync(join(__dirname, "../../eas.json"), "utf8")) as {
      build: { e2e: { env: { EXPO_PUBLIC_API_URL: string } } };
    };
    expect(eas.build.e2e.env.EXPO_PUBLIC_API_URL).toBe(`http://${EMULATOR_HOST}:${FIXTURE_PORT}`);
  });
});

describe("check-in routes (S3)", () => {
  // The clock is 25 November 2026, 12:00 UTC, which is 12:00 in London (GMT since 25 October):
  // the current month is 2026-11, the previous 2026-10 and the one before 2026-09.
  async function signedIn() {
    const { access_token } = await signIn();
    return (path: string, init: RequestInit = {}) =>
      fetch(url(path), {
        ...init,
        headers: {
          authorization: `Bearer ${access_token}`,
          "content-type": "application/json",
          ...init.headers,
        },
      });
  }

  const put = (api: Awaited<ReturnType<typeof signedIn>>, month: string, body: unknown) =>
    api(`/v1/snapshots/${month}`, { method: "PUT", body: JSON.stringify(body) });

  async function readAll(api: Awaited<ReturnType<typeof signedIn>>) {
    const accounts = AccountListResponse.parse(await (await api("/v1/accounts")).json());
    const details = AccountDetailListResponse.parse(
      await (await api("/v1/account-details")).json(),
    );
    const checkIns = SnapshotCheckInsResponse.parse(
      await (await api("/v1/snapshots/check-ins")).json(),
    );
    const id = (name: string) => accounts.find((a) => a.name === name)?.id ?? "";
    return { accounts, details, checkIns, id };
  }

  it("serves six manual accounts in saved order, each with no details, ignoring the query", async () => {
    const api = await signedIn();
    const res = await api("/v1/accounts?details=none&limit=50");
    expect(res.status).toBe(200);
    const accounts = AccountListResponse.parse(await res.json());
    expect(accounts.map((a) => [a.name, a.type, a.balance])).toEqual([
      ["Mortgage", "Mortgage", -185000],
      ["Workplace pension", "Pension", 48000],
      ["Credit card", "Credit Card", -650],
      ["Current account", "Current", 2400],
      ["Stocks and shares ISA", "Investment", 15500],
      ["Easy access savings", "Saving", 8200],
    ]);
    expect(accounts.every((a) => a.connectionId === null && a.details.length === 0)).toBe(true);
    expect(accounts[0]).toMatchObject({ interestRate: 4.5, monthlyContribution: 1100 });
  });

  it("serves last month for every account, the month before for three, and nothing this month", async () => {
    const api = await signedIn();
    const { accounts, details } = await readAll(api);
    const byMonth = (month: number) =>
      details
        .filter((d) => d.year === 2026 && d.month === month)
        .map((d) => [accounts.find((a) => a.id === d.accountId)?.name, d.value, d.asOfDate]);
    // Last month's row is each account's balance, dated 31 October.
    expect(byMonth(10)).toEqual(accounts.map((a) => [a.name, a.balance, "2026-10-31"]));
    expect(byMonth(9)).toEqual([
      ["Mortgage", -185400, "2026-09-30"],
      ["Credit card", -820, "2026-09-30"],
      ["Current account", 2100, "2026-09-30"],
    ]);
    expect(byMonth(11)).toEqual([]);
    expect(new Set(details.map((d) => d.source))).toEqual(new Set(["manual"]));
    expect(details).toHaveLength(9);
  });

  it("serves last month as both the started and the completed check-in", async () => {
    const api = await signedIn();
    const res = await api("/v1/snapshots/check-ins");
    expect(SnapshotCheckInsResponse.parse(await res.json())).toEqual({
      latestCompletedMonth: "2026-10",
      latestStartedMonth: "2026-10",
    });
  });

  it.each([
    ["GET", "/v1/accounts"],
    ["GET", "/v1/account-details"],
    ["GET", "/v1/snapshots/check-ins"],
    ["PUT", "/v1/snapshots/2026-11"],
  ])(
    "%s %s refuses a missing token with 401 and a person not invited with 403",
    async (method, path) => {
      const body = method === "PUT" ? JSON.stringify({ values: [] }) : undefined;
      const anon = await fetch(url(path), { method, body });
      expect(anon.status).toBe(401);
      expect(ErrorResponse.parse(await anon.json()).code).toBe("unauthorized");
      server.setScenario({ account: "not-invited" });
      const api = await signedIn();
      const res = await api(path, { method, body });
      expect(res.status).toBe(403);
      expect(ErrorResponse.parse(await res.json()).code).toBe("not_invited");
      server.setScenario({ account: "invited", terms: "required" });
      const refused = await api(path, { method, body });
      expect(refused.status).toBe(403);
      expect(ErrorResponse.parse(await refused.json()).code).toBe("terms_not_accepted");
      expect(server.stats().snapshotPuts).toBe(0);
    },
  );

  it.each([
    ["GET", "/v1/accounts"],
    ["GET", "/v1/account-details"],
    ["GET", "/v1/snapshots/check-ins"],
    ["PUT", "/v1/snapshots/2026-11"],
  ])(
    "%s %s answers 503 service_unavailable in the unavailable data scenario",
    async (method, path) => {
      server.setScenario({ data: "unavailable" });
      const api = await signedIn();
      const res = await api(path, {
        method,
        body: method === "PUT" ? JSON.stringify({ values: [], complete: true }) : undefined,
      });
      expect(res.status).toBe(503);
      expect(ErrorResponse.parse(await res.json()).code).toBe("service_unavailable");
      server.setScenario({ data: "ok" });
      expect(server.stats()).toMatchObject({ latestCompletedMonth: "2026-10", snapshotPuts: 0 });
    },
  );

  it("serves no accounts, no rows and no check-in months in the empty scenario", async () => {
    server.setScenario({ data: "empty" });
    const api = await signedIn();
    const { accounts, details, checkIns } = await readAll(api);
    expect(accounts).toEqual([]);
    expect(details).toEqual([]);
    expect(checkIns).toEqual({ latestCompletedMonth: null, latestStartedMonth: null });
  });

  it.each([
    ["a value that is not a number", "2026-11", { values: [{ value: "12" }] }, "body.values.0"],
    ["an unknown key", "2026-11", { values: [], done: true }, "body"],
    ["a month that does not exist", "2026-13", { values: [] }, "params.month"],
  ])("refuses %s with 400 validation_failed and changes nothing", async (_, month, body, at) => {
    const api = await signedIn();
    const before = await readAll(api);
    const card = before.id("Credit card");
    const sent = JSON.parse(
      JSON.stringify(body).replace('"value"', `"accountId":"${card}","value"`),
    );
    const res = await put(api, month, { ...sent, checkIn: true, complete: true });
    expect(res.status).toBe(400);
    const error = ErrorResponse.parse(await res.json());
    expect(error.code).toBe("validation_failed");
    expect(error.issues?.map((i) => i.path).some((p) => p.startsWith(at))).toBe(true);
    const after = await readAll(api);
    expect(after.details).toEqual(before.details);
    expect(after.accounts).toEqual(before.accounts);
    expect(after.checkIns).toEqual(before.checkIns);
    expect(server.stats()).toMatchObject({ snapshotPuts: 1, putsWithoutCheckIn: 0 });
  });

  it("refuses a body that is not JSON (400 invalid_json) and counts saves without checkIn: true", async () => {
    const api = await signedIn();
    const res = await api("/v1/snapshots/2026-11", { method: "PUT", body: "{values" });
    expect(res.status).toBe(400);
    expect(ErrorResponse.parse(await res.json()).code).toBe("invalid_json");
    expect(server.stats()).toMatchObject({ snapshotPuts: 1, putsWithoutCheckIn: 1 });
    // A string is not `checkIn: true`: refused, and counted as a save without it.
    const text = await put(api, "2026-11", { values: [], checkIn: "true" });
    expect(text.status).toBe(400);
    expect(server.stats()).toMatchObject({ snapshotPuts: 2, putsWithoutCheckIn: 2 });
  });

  it("refuses an unknown account with 404 and writes none of the batch", async () => {
    const api = await signedIn();
    const before = await readAll(api);
    const res = await put(api, "2026-11", {
      values: [
        { accountId: before.id("Current account"), value: 1250 },
        { accountId: randomUUID(), value: 10 },
      ],
      checkIn: true,
    });
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(await res.json()).code).toBe("not_found");
    const after = await readAll(api);
    expect(after.details).toEqual(before.details);
    expect(after.accounts).toEqual(before.accounts);
    expect(after.checkIns.latestStartedMonth).toBe("2026-10");
  });

  it("stores a liability negative whatever the sign, keeps an asset's sign and moves both balances", async () => {
    const api = await signedIn();
    const { id } = await readAll(api);
    const res = await put(api, "2026-11", {
      values: [
        { accountId: id("Credit card"), value: 700 },
        { accountId: id("Current account"), value: -50.25, source: "confirmed" },
      ],
      checkIn: true,
    });
    expect(res.status).toBe(200);
    // A current-month row is dated today (25 November); the liability 700 is stored as -700.
    expect(UpsertSnapshotResponse.parse(await res.json())).toEqual({
      month: "2026-11",
      values: [
        { accountId: id("Credit card"), value: -700, asOfDate: "2026-11-25", source: "manual" },
        {
          accountId: id("Current account"),
          value: -50.25,
          asOfDate: "2026-11-25",
          source: "confirmed",
        },
      ],
      completed: false,
    });
    const after = await readAll(api);
    const balance = (name: string) => after.accounts.find((a) => a.name === name)?.balance;
    expect([balance("Credit card"), balance("Current account"), balance("Mortgage")]).toEqual([
      -700, -50.25, -185000,
    ]);
    // Nine seeded rows (ids 1 to 9), so the two new rows are 10 and 11.
    const november = after.details.filter((d) => d.month === 11);
    expect(november.map((d) => [d.id, d.accountId, d.value, d.year])).toEqual([
      [10, id("Credit card"), -700, 2026],
      [11, id("Current account"), -50.25, 2026],
    ]);
    expect(after.checkIns).toEqual({
      latestStartedMonth: "2026-11",
      latestCompletedMonth: "2026-10",
    });
    expect(server.stats()).toMatchObject({ snapshotPuts: 1, putsWithoutCheckIn: 0 });
  });

  it("replaces a past month's row in place, dated the month's last day, and leaves the balance", async () => {
    const api = await signedIn();
    const before = await readAll(api);
    const card = before.id("Credit card");
    const old = before.details.find((d) => d.accountId === card && d.month === 10);
    clock += 1_000;
    const res = await put(api, "2026-10", { values: [{ accountId: card, value: -900 }] });
    expect(res.status).toBe(200);
    const after = await readAll(api);
    const rows = after.details.filter((d) => d.accountId === card && d.month === 10);
    expect(rows).toEqual([
      {
        ...old,
        value: -900,
        asOfDate: "2026-10-31",
        source: "manual",
        updatedAt: new Date(clock).toISOString(),
      },
    ]);
    expect(after.accounts.find((a) => a.id === card)?.balance).toBe(-650);
    // No `checkIn`: the months stay, and the write is counted as one without it.
    expect(after.checkIns).toEqual(before.checkIns);
    expect(server.stats()).toMatchObject({ snapshotPuts: 1, putsWithoutCheckIn: 1 });
  });

  it("starts the month only for a check-in save with a value, and complete finishes it", async () => {
    const api = await signedIn();
    const { id } = await readAll(api);
    const months = () => {
      const { latestStartedMonth, latestCompletedMonth } = server.stats();
      return [latestStartedMonth, latestCompletedMonth];
    };
    expect((await put(api, "2026-11", { values: [], checkIn: true })).status).toBe(200);
    expect(months()).toEqual(["2026-10", "2026-10"]);
    await put(api, "2026-11", {
      values: [{ accountId: id("Mortgage"), value: 1 }],
      checkIn: false,
    });
    expect(months()).toEqual(["2026-10", "2026-10"]);
    await put(api, "2026-11", { values: [{ accountId: id("Mortgage"), value: 1 }], checkIn: true });
    expect(months()).toEqual(["2026-11", "2026-10"]);
    const done = await put(api, "2026-11", { values: [], checkIn: true, complete: true });
    expect(UpsertSnapshotResponse.parse(await done.json()).completed).toBe(true);
    expect(months()).toEqual(["2026-11", "2026-11"]);
    // An earlier month never moves either back.
    await put(api, "2026-09", { values: [], complete: true });
    expect(months()).toEqual(["2026-11", "2026-11"]);
    expect(server.stats()).toMatchObject({ snapshotPuts: 5, putsWithoutCheckIn: 2 });
  });

  it("reset restores the canned data, with new ids, and clears the counts", async () => {
    const api = await signedIn();
    const before = await readAll(api);
    await put(api, "2026-11", {
      values: [{ accountId: before.id("Credit card"), value: 1 }],
      checkIn: true,
      complete: true,
    });
    await fetch(url("/__fixture/reset"), { method: "POST" });
    const again = await signedIn();
    const after = await readAll(again);
    const strip = (a: { name: string; balance: number }) => [a.name, a.balance];
    expect(after.accounts.map(strip)).toEqual(before.accounts.map(strip));
    expect(after.accounts[0]?.id).not.toBe(before.accounts[0]?.id);
    expect(after.details).toHaveLength(9);
    expect(after.checkIns).toEqual({
      latestStartedMonth: "2026-10",
      latestCompletedMonth: "2026-10",
    });
    expect(server.stats()).toMatchObject({ snapshotPuts: 0, putsWithoutCheckIn: 0 });
  });

  it("stats give the current month in London, not UTC", async () => {
    expect((await (await fetch(url("/__fixture/stats"))).json()) as object).toMatchObject({
      currentMonth: "2026-11",
      latestStartedMonth: "2026-10",
      latestCompletedMonth: "2026-10",
      snapshotPuts: 0,
      putsWithoutCheckIn: 0,
    });
    // 30 June 2026, 23:30 UTC is 1 July, 00:30 in London (BST, UTC+1).
    clock = Date.UTC(2026, 5, 30, 23, 30);
    expect(server.stats().currentMonth).toBe("2026-07");
    clock = Date.UTC(2026, 5, 30, 22, 59);
    expect(server.stats().currentMonth).toBe("2026-06");
  });
});

describe("check-in steps for the fixture", () => {
  const now = new Date(Date.UTC(2026, 10, 25, 12));
  const store = buildCheckInStore("user_steps", now, "ok");
  const steps = checkInStepsFor(store, now);

  it("follow web's order, not the saved order", () => {
    expect(steps.map((s) => [s.name, s.type])).toEqual([
      ["Current account", "Current"],
      ["Easy access savings", "Saving"],
      ["Credit card", "Credit Card"],
      ["Stocks and shares ISA", "Investment"],
      ["Workplace pension", "Pension"],
      ["Mortgage", "Mortgage"],
    ]);
    expect(steps.every((s) => s.recorded === null && s.lastMonth === "2026-10")).toBe(true);
  });

  it("offer a calculated figure for the mortgage only, from October's balance", () => {
    expect(steps.filter((s) => s.calculated !== null).map((s) => s.name)).toEqual(["Mortgage"]);
    const mortgage = steps.at(-1);
    // The engine's figure for the fixture's own inputs, typed out here, not read from the fixture.
    const expected = calculateCheckInBalance({
      type: "Mortgage",
      interestRate: 4.5,
      monthlyPayment: 1100,
      base: { value: -185000, month: "2026-10" },
      month: "2026-11",
      savedBalance: -185000,
    });
    expect(expected).not.toBeNull();
    expect(mortgage?.calculated).toEqual(expected);
    // Sanity check by hand: 185,000 x 4.5% / 12 = 693.75 interest, less the 1,100 payment, is
    // 184,593.75 owed.
    expect(mortgage?.calculated?.value).toBe(184593.75);
    expect(mortgage?.lastValue).toBe(185000);
  });
});

describe("canned /v1: sign-out (E12 S2b)", () => {
  const signOut = (token?: string) =>
    fetch(url("/v1/session/sign-out"), {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
  const refresh = (token: string) =>
    authenticate({ grant_type: "refresh_token", refresh_token: token });

  it("revokes the token's own session: its access and refresh tokens stop working", async () => {
    const mine = await signIn();
    const other = await signIn();
    const res = await signOut(mine.access_token);
    expect(res.status).toBe(204);
    expect(server.stats().signOuts).toBe(1);
    expect((await getProfile(mine.access_token)).status).toBe(401);
    expect((await refresh(mine.refresh_token)).status).toBe(400);
    // Another session of the same person is untouched.
    expect((await getProfile(other.access_token)).status).toBe(200);
  });

  it("refuses a missing or revoked token with 401 and counts nothing", async () => {
    expect((await signOut()).status).toBe(401);
    const mine = await signIn();
    await signOut(mine.access_token);
    expect((await signOut(mine.access_token)).status).toBe(401);
    expect(server.stats().signOuts).toBe(1);
  });

  it.each([
    ["not invited", { account: "not-invited" }],
    ["terms not agreed", { terms: "required" }],
  ] as const)("serves a person who is %s", async (_name, patch) => {
    const mine = await signIn();
    server.setScenario(patch);
    expect((await signOut(mine.access_token)).status).toBe(204);
  });
});

describe("WorkOS stand-in: max_age", () => {
  it("records the last authorize's max_age, and null when none was sent; reset forgets it", async () => {
    expect(server.stats().lastAuthorizeMaxAge).toBeNull();
    await authorize(pkcePair().challenge, "s", { max_age: "0" });
    expect(server.stats().lastAuthorizeMaxAge).toBe("0");
    await authorize(pkcePair().challenge, "s");
    expect(server.stats().lastAuthorizeMaxAge).toBeNull();
    await authorize(pkcePair().challenge, "s", { max_age: "0" });
    await fetch(url("/__fixture/reset"), { method: "POST" });
    expect(server.stats().lastAuthorizeMaxAge).toBeNull();
  });
});

describe("fixture stats: waiting for a sign-out", () => {
  const stats = (query = "") =>
    fetch(url(`/__fixture/stats${query}`)).then(
      async (r) => (await r.json()) as { signOuts: number },
    );

  it("with signOutsAtLeast, answers only once the sign-out has landed", async () => {
    const mine = await signIn();
    let answered = false;
    const waiting = stats("?signOutsAtLeast=1").then((s) => {
      answered = true;
      return s;
    });
    // A full round trip to the server while the stats request waits: still no answer.
    expect((await getProfile(mine.access_token)).status).toBe(200);
    expect(answered).toBe(false);
    await fetch(url("/v1/session/sign-out"), {
      method: "POST",
      headers: { authorization: `Bearer ${mine.access_token}` },
    });
    expect((await waiting).signOuts).toBe(1);
  });

  it("answers at once when the count is already there, or when none is asked for", async () => {
    expect((await stats()).signOuts).toBe(0);
    const mine = await signIn();
    await fetch(url("/v1/session/sign-out"), {
      method: "POST",
      headers: { authorization: `Bearer ${mine.access_token}` },
    });
    expect((await stats("?signOutsAtLeast=1")).signOuts).toBe(1);
  });
});

describe("canned /v1: version skew (PR #951)", () => {
  it.each([
    ["current", true, false],
    ["older", false, false],
    ["newer", true, true],
  ] as const)("the %s backend's profile", async (backend, hasPartnerMode, hasExtra) => {
    server.setScenario({ backend });
    const { access_token } = await signIn();
    const body = (await (await getProfile(access_token)).json()) as Record<string, unknown>;
    expect("partnerMode" in body).toBe(hasPartnerMode);
    expect("fieldFromALaterBackend" in body).toBe(hasExtra);
  });
});
