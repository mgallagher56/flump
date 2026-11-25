/**
 * @jest-environment node
 */
import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createApiClient } from "@flump/api-client";
import { ClientPolicyResponse, UserProfileResponse } from "@flump/api-contract";
import { EMULATOR_HOST, FIXTURE_PORT, type FixtureServer, startFixtureServer } from "./server";

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
  server = await startFixtureServer({ port: 0, clientId: CLIENT_ID, now: () => clock });
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

  it("answers an unknown /v1 route with 404, not a canned body", async () => {
    const { access_token } = await signIn();
    const res = await fetch(url("/v1/accounts"), {
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

  it("replaces the refresh token on use and rejects the old one at once", async () => {
    const first = await signIn();
    const res = await refresh(first.refresh_token);
    expect(res.status).toBe(200);
    const next = (await res.json()) as { access_token: string; refresh_token: string };
    expect(next.refresh_token).not.toBe(first.refresh_token);
    expect((await getProfile(next.access_token)).status).toBe(200);
    const again = await refresh(first.refresh_token);
    expect(again.status).toBe(400);
    expect(((await again.json()) as { error: string }).error).toBe("invalid_grant");
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

  it("the sign-out page sends the browser back to the given return address", async () => {
    const res = await fetch(
      url(`/user_management/sessions/logout?return_to=${encodeURIComponent(REDIRECT)}`),
      { redirect: "manual" },
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(REDIRECT);
  });

  it("the sign-out page refuses an unregistered return address", async () => {
    const res = await fetch(
      url("/user_management/sessions/logout?return_to=https%3A%2F%2Fexample.com"),
      {
        redirect: "manual",
      },
    );
    expect(res.status).toBe(400);
    expect(res.headers.get("location")).toBeNull();
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
