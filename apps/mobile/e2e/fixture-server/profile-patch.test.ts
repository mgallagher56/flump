/**
 * @jest-environment node
 */
/**
 * The fixture server's profile save (E12 S9): `PATCH /v1/user-profile` checks the body with the
 * contract's strict schema and `If-Match` against the profile's version, as the backend does, and
 * keeps the change until a reset, so Home's figure follows it in the Maestro flow.
 */
import { createHash, randomBytes } from "node:crypto";
import { AccountDetailListResponse, AccountListResponse, etagFor } from "@flump/api-contract";
import {
  netWorthBasisFromProfile,
  PortfolioSnapshot,
  selectNetWorth,
} from "@flump/finance-engine/net-worth";
import { type FixtureServer, startFixtureServer } from "./server";
import { newSigningKey } from "./tokens";

const signingKey = newSigningKey();
const CLIENT_ID = "client_e2e_profile";
const REDIRECT = "flump://auth/callback";
const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);

let server: FixtureServer;

beforeEach(async () => {
  server = await startFixtureServer({ port: 0, clientId: CLIENT_ID, now: () => NOW, signingKey });
});

afterEach(async () => {
  await server.close();
});

/** Signs in through the stand-in; returns a fetch with the access token. */
async function signedIn() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT,
    response_type: "code",
    provider: "authkit",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "s",
  });
  const auth = await fetch(`${server.origin}/user_management/authorize?${query}`, {
    redirect: "manual",
  });
  const code = new URL(auth.headers.get("location") ?? "").searchParams.get("code") ?? "";
  const tokens = await fetch(`${server.origin}/user_management/authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
    }),
  });
  const { access_token } = (await tokens.json()) as { access_token: string };
  return (path: string, init: { method?: string; body?: unknown; ifMatch?: string } = {}) =>
    fetch(`${server.origin}${path}`, {
      method: init.method ?? "GET",
      headers: {
        authorization: `Bearer ${access_token}`,
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...(init.ifMatch ? { "if-match": init.ifMatch } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
}

type Api = Awaited<ReturnType<typeof signedIn>>;
const profileOf = async (api: Api) =>
  (await (await api("/v1/user-profile")).json()) as Record<string, unknown> & {
    updatedAt: string;
  };

describe("PATCH /v1/user-profile", () => {
  it("saves a change sent with the current version, moves the version on, and GET returns it", async () => {
    const api = await signedIn();
    const before = await profileOf(api);
    expect(before.updatedAt).toBe(new Date(NOW).toISOString());
    const res = await api("/v1/user-profile", {
      method: "PATCH",
      body: { netWorthCountsProperty: false },
      ifMatch: etagFor(before.updatedAt),
    });
    expect(res.status).toBe(200);
    const saved = (await res.json()) as Record<string, unknown>;
    expect(saved.netWorthCountsProperty).toBe(false);
    // One millisecond on: always later than the version it replaced.
    expect(saved.updatedAt).toBe(new Date(NOW + 1).toISOString());
    const after = await profileOf(api);
    expect([after.netWorthCountsProperty, after.updatedAt]).toEqual([false, saved.updatedAt]);
  });

  it("the home owner's net worth drops by the home less its mortgage once property is not counted", async () => {
    server.setScenario({ data: "owner" });
    const api = await signedIn();
    const accounts = AccountListResponse.parse(await (await api("/v1/accounts")).json());
    const details = AccountDetailListResponse.parse(
      await (await api("/v1/account-details")).json(),
    );
    const figure = async () =>
      selectNetWorth(
        new PortfolioSnapshot(accounts, details),
        netWorthBasisFromProfile(
          (await profileOf(api)) as Parameters<typeof netWorthBasisFromProfile>[0],
        ),
      ).netWorth;
    const counted = await figure();
    await api("/v1/user-profile", { method: "PATCH", body: { netWorthCountsProperty: false } });
    const notCounted = await figure();
    // The difference is exactly the property and mortgage balances, added up from the accounts.
    const homeLessMortgage = accounts
      .filter((a) => a.type === "Property" || a.type === "Mortgage")
      .reduce((sum, a) => sum + a.balance, 0);
    expect(homeLessMortgage).not.toBe(0);
    expect(counted - notCounted).toBe(homeLessMortgage);
  });

  it("refuses a stale If-Match with 412 and saves nothing", async () => {
    const api = await signedIn();
    const res = await api("/v1/user-profile", {
      method: "PATCH",
      body: { checkInDay: 12 },
      ifMatch: etagFor("2026-01-01T00:00:00.000Z"),
    });
    expect(res.status).toBe(412);
    expect(((await res.json()) as { code: string }).code).toBe("precondition_failed");
    expect((await profileOf(api)).checkInDay).toBeNull();
  });

  it.each([
    ["an unknown key", { notAField: true }],
    ["a day past the 31st", { checkInDay: 32 }],
  ])("refuses %s with 400 validation_failed, as the strict contract does", async (_name, body) => {
    const api = await signedIn();
    const res = await api("/v1/user-profile", { method: "PATCH", body });
    expect(res.status).toBe(400);
    expect(((await res.json()) as { code: string }).code).toBe("validation_failed");
  });

  it("a reset forgets the change", async () => {
    const api = await signedIn();
    await api("/v1/user-profile", { method: "PATCH", body: { firstName: "Samira" } });
    expect((await profileOf(api)).firstName).toBe("Samira");
    await fetch(`${server.origin}/__fixture/reset`, { method: "POST" });
    const fresh = await signedIn();
    expect((await profileOf(fresh)).firstName).not.toBe("Samira");
  });

  it("needs a signed-in, invited person", async () => {
    const res = await fetch(`${server.origin}/v1/user-profile`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(401);
  });
});
