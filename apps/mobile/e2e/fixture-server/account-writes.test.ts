/**
 * @jest-environment node
 */
/**
 * The fixture server's account writes (E12 S8): add, the mortgage with its property, change with
 * If-Match, and delete, each body checked with the contract's strict schema and applied as the
 * backend does, so the Maestro flows see the list, Home and the account page follow.
 */
import { createHash, randomBytes } from "node:crypto";
import { AccountDetailListResponse, AccountListResponse, etagFor } from "@flump/api-contract";
import { type FixtureServer, startFixtureServer } from "./server";
import { newSigningKey } from "./tokens";

const signingKey = newSigningKey();
const CLIENT_ID = "client_e2e_accounts";
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
const list = async (api: Api) =>
  AccountListResponse.parse(await (await api("/v1/accounts")).json());
const months = async (api: Api) =>
  AccountDetailListResponse.parse(await (await api("/v1/account-details")).json());

describe("account writes", () => {
  it("adds an account, a debt stored as minus the amount owed, with this month's row", async () => {
    server.setScenario({ data: "empty" });
    const api = await signedIn();
    const res = await api("/v1/accounts", {
      method: "POST",
      body: { name: "Card", type: "Credit Card", balance: 500, ownership: "sole" },
    });
    expect(res.status).toBe(201);
    const [card] = await list(api);
    expect([card?.name, card?.balance]).toEqual(["Card", -500]);
    const rows = await months(api);
    // 25 November 2026 on the server's clock: one row for November at the stored balance.
    expect(rows.map((r) => [r.accountId, r.year, r.month, r.value])).toEqual([
      [card?.id, 2026, 11, -500],
    ]);
  });

  it("refuses a body the contract refuses, and changes nothing", async () => {
    server.setScenario({ data: "empty" });
    const api = await signedIn();
    const res = await api("/v1/accounts", {
      method: "POST",
      body: { name: "", type: "Saving", balance: 1 },
    });
    expect(res.status).toBe(400);
    expect(await list(api)).toEqual([]);
  });

  it("adds a mortgage and its home together, linked", async () => {
    server.setScenario({ data: "empty" });
    const api = await signedIn();
    const res = await api("/v1/accounts/mortgage-with-property", {
      method: "POST",
      body: { mortgage: { name: "Mortgage", balance: -200000 }, property: { balance: 300000 } },
    });
    expect(res.status).toBe(201);
    const accounts = await list(api);
    const home = accounts.find((a) => a.type === "Property");
    const mortgage = accounts.find((a) => a.type === "Mortgage");
    expect([home?.balance, home?.accountSubtype]).toEqual([300000, "home"]);
    expect([mortgage?.balance, mortgage?.linkedAccountId]).toEqual([-200000, home?.id]);
  });

  it("changes an account with the version read; a stale version is refused with 412", async () => {
    const api = await signedIn();
    const [first] = await list(api);
    if (!first) throw new Error("expected an account");
    const stale = await api(`/v1/accounts/${first.id}`, {
      method: "PATCH",
      body: { name: "Renamed" },
      ifMatch: etagFor("2020-01-01T00:00:00.000Z"),
    });
    expect(stale.status).toBe(412);
    const ok = await api(`/v1/accounts/${first.id}`, {
      method: "PATCH",
      body: { name: "Renamed" },
      ifMatch: etagFor(first.updatedAt),
    });
    expect(ok.status).toBe(200);
    expect((await list(api)).find((a) => a.id === first.id)?.name).toBe("Renamed");
  });

  it("a debt changed to something owned turns positive", async () => {
    server.setScenario({ data: "empty" });
    const api = await signedIn();
    await api("/v1/accounts", {
      method: "POST",
      body: { name: "Loan", type: "Loan", balance: 300 },
    });
    const [loan] = await list(api);
    await api(`/v1/accounts/${loan?.id}`, { method: "PATCH", body: { type: "Saving" } });
    expect((await list(api))[0]?.balance).toBe(300);
  });

  it("deletes an account with its months; a second delete is not found", async () => {
    const api = await signedIn();
    const [first] = await list(api);
    if (!first) throw new Error("expected an account");
    const res = await api(`/v1/accounts/${first.id}`, { method: "DELETE" });
    expect([res.status, await res.json()]).toEqual([200, { success: true }]);
    expect((await list(api)).some((a) => a.id === first.id)).toBe(false);
    expect((await months(api)).some((r) => r.accountId === first.id)).toBe(false);
    expect((await api(`/v1/accounts/${first.id}`, { method: "DELETE" })).status).toBe(404);
  });
});
