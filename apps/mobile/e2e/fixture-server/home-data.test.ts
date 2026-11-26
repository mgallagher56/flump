/**
 * @jest-environment node
 */
/**
 * Home's data scenarios (E12 S5): `owner` and `renter`, the home-owning and renting households of
 * `apps/e2e/support/personas.ts` with six recorded months, and `malformed`. The households' figures
 * are copied (personas.ts imports Playwright), so the first test pins them to the source.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AccountDetailListResponse,
  AccountListResponse,
  SnapshotCheckInsResponse,
} from "@flump/api-contract";
import {
  netWorthBasisFromProfile,
  PortfolioSnapshot,
  selectNetWorth,
  selectNetWorthChange,
  selectNetWorthTrend,
  selectSavedNetWorthSeries,
} from "@flump/finance-engine/net-worth";
import {
  HOMEOWNER_ACCOUNTS,
  PERSONA_HISTORY_MONTHS,
  type PersonaAccount,
  RENTER_ACCOUNTS,
} from "./fixtures";
import { type FixtureServer, startFixtureServer } from "./server";
import { newSigningKey } from "./tokens";

/** One key for the file: a fresh RSA key per test cost seconds of CI time. */
const signingKey = newSigningKey();
const CLIENT_ID = "client_e2e_home";
const REDIRECT = "flump://auth/callback";

let server: FixtureServer;

beforeEach(async () => {
  server = await startFixtureServer({
    port: 0,
    clientId: CLIENT_ID,
    // 25 November 2026, 12:00 London: the current month is 2026-11.
    now: () => Date.UTC(2026, 10, 25, 12, 0, 0),
    signingKey,
  });
});

afterEach(async () => {
  await server.close();
});

/** Signs in through the stand-in and returns a fetch with the access token. */
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
  return (path: string) =>
    fetch(`${server.origin}${path}`, { headers: { authorization: `Bearer ${access_token}` } });
}

async function heroFor(data: "owner" | "renter") {
  server.setScenario({ data });
  const api = await signedIn();
  const accounts = AccountListResponse.parse(await (await api("/v1/accounts")).json());
  const details = AccountDetailListResponse.parse(await (await api("/v1/account-details")).json());
  const checkIns = SnapshotCheckInsResponse.parse(
    await (await api("/v1/snapshots/check-ins")).json(),
  );
  const profile = (await (await api("/v1/user-profile")).json()) as Record<string, unknown>;
  // The same engine calls as web's Home loader and the app's useHomeData.
  const basis = netWorthBasisFromProfile(profile);
  const totals = selectNetWorth(new PortfolioSnapshot(accounts, details), basis);
  const series = selectSavedNetWorthSeries(accounts, details, "2026-11", basis);
  return {
    accounts,
    details,
    checkIns,
    totals,
    change: selectNetWorthChange(totals.netWorth, series, "2026-11"),
    trend: selectNetWorthTrend(series),
  };
}

describe("Home's households", () => {
  it.each([
    ["RENTER", RENTER_ACCOUNTS],
    ["HOMEOWNER", HOMEOWNER_ACCOUNTS],
  ] as const)("%s's accounts are personas.ts's, figure for figure", (name, copied) => {
    const source = readFileSync(join(__dirname, "../../../e2e/support/personas.ts"), "utf8");
    expect(source).toContain(`export const HISTORY_MONTHS = ${PERSONA_HISTORY_MONTHS};`);
    const start = source.indexOf(`export const ${name}: Persona = {`);
    const block = source.slice(start, source.indexOf("budget:", start));
    // Each account's object literal in the persona, comments and whitespace removed.
    const objects = [...block.matchAll(/\{([^{}]*name: "[^"]+"[^{}]*)\}/g)].map((m) =>
      (m[1] ?? "").replace(/\/\/[^\n]*/g, ""),
    );
    const field = (text: string, key: string) =>
      new RegExp(`\\b${key}: ("[^"]*"|-?[\\d.]+)`).exec(text)?.[1]?.replaceAll('"', "");
    const keys = [
      "name",
      "type",
      "balance",
      "monthlyChange",
      "interestRate",
      "monthlyContribution",
      "termMonths",
      "studentLoanPlan",
    ] as const;
    const fromSource = objects.map((text) =>
      Object.fromEntries(
        keys.flatMap((k) => (field(text, k) === undefined ? [] : [[k, field(text, k)]])),
      ),
    );
    const fromCopy = copied.map((a: PersonaAccount) =>
      Object.fromEntries(keys.flatMap((k) => (a[k] === undefined ? [] : [[k, String(a[k])]]))),
    );
    expect(fromCopy).toEqual(fromSource);
  });

  it("the renter: six recorded months, the student loan left out, as web's Home shows it", async () => {
    const { details, checkIns, totals, change, trend } = await heroFor("renter");
    expect(new Set(details.map((d) => `${d.year}-${d.month}`)).size).toBe(6);
    expect(checkIns.latestCompletedMonth).toBe("2026-10");
    // 1,300 + 3,200 + 9,000 - 1,800; the student loan is not counted by default.
    expect(totals.netWorth).toBe(11700);
    expect(totals.leftOut).toEqual(["studentLoan"]);
    // October: 1,280 + 3,050 + 8,740 - 1,835.
    expect(change).toEqual({ priorMonth: "2026-10", change: 465 });
    // £465 a month: 20 + 150 + 260 in, and £35 off the card.
    expect(trend?.bars.map((b) => [b.month, b.netWorth])).toEqual([
      ["2026-05", 8910],
      ["2026-06", 9375],
      ["2026-07", 9840],
      ["2026-08", 10305],
      ["2026-09", 10770],
      ["2026-10", 11235],
    ]);
  });

  it("the home owner: the home and mortgage counted, a change since October", async () => {
    const { accounts, totals, change, trend } = await heroFor("owner");
    expect(accounts.find((a) => a.name === "Residential mortgage")?.balance).toBe(-186000);
    // 3,400 + 7,600 + 10,000 + 310,000 - 186,000 + 96,000 - 8,400 - 1,200.
    expect(totals.netWorth).toBe(231400);
    expect(totals.leftOut).toEqual([]);
    // October: 3,360 + 7,380 + 9,865 + 309,500 - 186,550 + 95,100 - 8,610 - 1,220.
    expect(change).toEqual({ priorMonth: "2026-10", change: 2575 });
    expect(trend?.bars).toHaveLength(6);
    expect(trend?.bars.at(-1)).toMatchObject({ month: "2026-10", netWorth: 228825, latest: true });
  });

  it("malformed: GET /accounts has an account with no balance, which the contract refuses", async () => {
    server.setScenario({ data: "malformed" });
    const api = await signedIn();
    const body = (await (await api("/v1/accounts")).json()) as Record<string, unknown>[];
    expect(body).toHaveLength(6);
    expect("balance" in (body[0] ?? {})).toBe(false);
    expect(body.slice(1).every((a) => typeof a.balance === "number")).toBe(true);
    expect(AccountListResponse.safeParse(body).success).toBe(false);
  });
});
