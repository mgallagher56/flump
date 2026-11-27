/**
 * @jest-environment node
 */
/**
 * The fixture server's budget writes (E12 S10): `POST`, `PATCH` (with `If-Match`) and `DELETE
 * /v1/budget-entries`, checked with the contract's strict schemas as the backend does, and kept
 * until a reset, so the Budget flow sees its own change.
 */
import { createHash, randomBytes } from "node:crypto";
import { BudgetEntryListResponse, etagFor } from "@flump/api-contract";
import { type FixtureServer, startFixtureServer } from "./server";
import { newSigningKey } from "./tokens";

const signingKey = newSigningKey();
const CLIENT_ID = "client_e2e_budget";
const REDIRECT = "flump://auth/callback";
const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);

let server: FixtureServer;

beforeEach(async () => {
  server = await startFixtureServer({ port: 0, clientId: CLIENT_ID, now: () => NOW, signingKey });
  server.setScenario({ data: "renter" });
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
const rowsOf = async (api: Api) =>
  BudgetEntryListResponse.parse(await (await api("/v1/budget-entries")).json());

describe("the budget's writes", () => {
  it("the rows keep their ids between reads", async () => {
    const api = await signedIn();
    const first = (await rowsOf(api)).map((r) => r.id);
    expect(first).toHaveLength(12);
    expect((await rowsOf(api)).map((r) => r.id)).toEqual(first);
  });

  it("PATCH with the current version saves, moves the version on, and GET returns it", async () => {
    const api = await signedIn();
    const rent = (await rowsOf(api)).find((r) => r.name === "Rent");
    if (!rent) throw new Error("no rent");
    const res = await api(`/v1/budget-entries/${rent.id}`, {
      method: "PATCH",
      body: { amount: 1000 },
      ifMatch: etagFor(rent.updatedAt),
    });
    expect(res.status).toBe(200);
    const saved = (await res.json()) as { amount: number; updatedAt: string };
    expect(saved.amount).toBe(1000);
    expect(saved.updatedAt).toBe(new Date(NOW + 1).toISOString());
    const after = (await rowsOf(api)).find((r) => r.id === rent.id);
    expect([after?.amount, after?.updatedAt]).toEqual([1000, saved.updatedAt]);
    expect(server.stats().budgetWrites).toBe(1);
  });

  it("an old version is 412 and saves nothing", async () => {
    const api = await signedIn();
    const rent = (await rowsOf(api)).find((r) => r.name === "Rent");
    if (!rent) throw new Error("no rent");
    const res = await api(`/v1/budget-entries/${rent.id}`, {
      method: "PATCH",
      body: { amount: 1000 },
      ifMatch: etagFor("2020-01-01T00:00:00.000Z"),
    });
    expect(res.status).toBe(412);
    expect(((await res.json()) as { code: string }).code).toBe("precondition_failed");
    expect((await rowsOf(api)).find((r) => r.id === rent.id)?.amount).toBe(950);
    expect(server.stats().budgetWrites).toBe(0);
  });

  it("a server-owned key is refused, as the backend's strict body", async () => {
    const api = await signedIn();
    const res = await api("/v1/budget-entries", {
      method: "POST",
      body: { category: "bills", name: "Water", amount: 25, isPrimaryIncome: false },
    });
    expect(res.status).toBe(400);
    expect(await rowsOf(api)).toHaveLength(12);
  });

  it("POST adds a sole row; DELETE removes it; an unknown row is 404", async () => {
    const api = await signedIn();
    const res = await api("/v1/budget-entries", {
      method: "POST",
      body: { category: "bills", name: "Water", amount: 25, isEssential: true, ownership: "sole" },
    });
    expect(res.status).toBe(200);
    const row = (await res.json()) as { id: string; ownership: string; sharePercent: null };
    expect([row.ownership, row.sharePercent]).toEqual(["sole", null]);
    expect((await rowsOf(api)).map((r) => r.name)).toContain("Water");
    expect((await api(`/v1/budget-entries/${row.id}`, { method: "DELETE" })).status).toBe(200);
    expect((await rowsOf(api)).map((r) => r.name)).not.toContain("Water");
    expect((await api(`/v1/budget-entries/${row.id}`, { method: "DELETE" })).status).toBe(404);
    expect(server.stats().budgetWrites).toBe(2);
  });

  it("a reset brings the persona's budget back", async () => {
    const api = await signedIn();
    const rent = (await rowsOf(api)).find((r) => r.name === "Rent");
    if (!rent) throw new Error("no rent");
    await api(`/v1/budget-entries/${rent.id}`, { method: "DELETE" });
    await fetch(`${server.origin}/__fixture/reset`, { method: "POST" });
    server.setScenario({ data: "renter" });
    const again = await signedIn();
    expect((await rowsOf(again)).map((r) => r.name)).toContain("Rent");
    expect(server.stats().budgetWrites).toBe(0);
  });
});
