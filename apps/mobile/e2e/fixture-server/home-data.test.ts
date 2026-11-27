/**
 * @jest-environment node
 */
/**
 * Home's data scenarios (E12 S5): `owner` and `renter`, the home-owning and renting households of
 * `apps/e2e/support/personas.ts` with six recorded months, and `malformed`. The households' figures
 * are copied (personas.ts imports Playwright), so the first tests pin them to the source. Since S5b
 * each also has a saved budget, and `renter-linked`, `scottish-refused`, `no-budget` and
 * `pension-only` give the strip's other states; the strip's figures are worked out by hand below.
 */
import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AccountDetailListResponse,
  AccountListResponse,
  BudgetEntryListResponse,
  SnapshotCheckInsResponse,
  UserProfileResponse,
} from "@flump/api-contract";
import { type HomeStrip, selectHomeStripFromRows } from "@flump/finance-engine/home-strip";
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
  HOMEOWNER_BUDGET,
  HOMEOWNER_FACTS,
  PERSONA_HISTORY_MONTHS,
  type PersonaAccount,
  type PersonaBudgetRow,
  RENTER_ACCOUNTS,
  RENTER_BUDGET,
  RENTER_FACTS,
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

/** personas.ts's source text, and one persona's block of it. */
function personaBlock(name: string, from: string, to: string): string {
  const source = readFileSync(join(__dirname, "../../../e2e/support/personas.ts"), "utf8");
  const start = source.indexOf(`export const ${name}: Persona = {`);
  const at = source.indexOf(from, start);
  return source.slice(at, source.indexOf(to, at));
}

/** 25 November 2026 (2026/27, confirmed rates) and 10 May 2027 (2027/28, provisional, no Scottish rates). */
const NOV_2026 = new Date(Date.UTC(2026, 10, 25, 12, 0, 0));
const MAY_2027 = new Date(Date.UTC(2027, 4, 10, 12, 0, 0));

type HomeData =
  | "owner"
  | "renter"
  | "renter-linked"
  | "scottish-refused"
  | "no-budget"
  | "pension-only";

/** The strip as the app builds it from the served bodies (useHomeData), on the device's date. */
async function stripFor(data: HomeData, today = NOV_2026): Promise<HomeStrip> {
  server.setScenario({ data });
  const api = await signedIn();
  const accounts = AccountListResponse.parse(await (await api("/v1/accounts")).json());
  const details = AccountDetailListResponse.parse(await (await api("/v1/account-details")).json());
  const budgetEntries = BudgetEntryListResponse.parse(
    await (await api("/v1/budget-entries")).json(),
  );
  const profile = UserProfileResponse.parse(await (await api("/v1/user-profile")).json());
  return selectHomeStripFromRows({ accounts, details, budgetEntries, profile, today });
}

describe("Home's strip in each household (S5b)", () => {
  it.each([
    ["RENTER", RENTER_BUDGET],
    ["HOMEOWNER", HOMEOWNER_BUDGET],
  ] as const)("%s's budget is personas.ts's, row for row", (name, copied) => {
    const block = personaBlock(name, "budget: [", "],");
    const fromSource = [...block.matchAll(/\{([^{}]*)\}/g)].map((m) => {
      const text = m[1] ?? "";
      const field = (key: string) =>
        new RegExp(`\\b${key}: ("[^"]*"|-?[\\d.]+|true|false)`)
          .exec(text)?.[1]
          ?.replaceAll('"', "");
      return Object.fromEntries(
        ["name", "category", "amount", "isIncome", "isEssential"].flatMap((k) =>
          field(k) === undefined ? [] : [[k, field(k)]],
        ),
      );
    });
    const fromCopy = copied.map((row: PersonaBudgetRow) =>
      Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v)])),
    );
    expect(fromCopy).toEqual(fromSource);
  });

  it.each([
    ["RENTER", RENTER_FACTS],
    ["HOMEOWNER", HOMEOWNER_FACTS],
  ] as const)("%s's profile answers are personas.ts's", (name, facts) => {
    const block = personaBlock(name, "profile: {", "accounts:");
    for (const [key, value] of Object.entries(facts)) {
      expect(block).toContain(`${key}: ${JSON.stringify(value).replaceAll(",", ", ")}`);
    }
  });

  it("the renter: £125 left over from the typed budget and £1,800 owed (acceptance 1)", async () => {
    // Income 2,085. Essentials 950 + 115 + 80 + 40 + 250 + 120 + 60 = 1,615; other spending
    // 90 + 25 + 80 = 195; savings 150. Left over 2,085 - 1,615 - 195 - 150 = 125. Owed: the
    // credit card's 1,800; the student loan is not consumer debt, and with debt no pension card.
    expect(await stripFor("renter")).toEqual({
      first: { kind: "leftOver", figure: 125, leavesOut: null },
      second: { kind: "owed", figure: 1800 },
      collapsed: false,
      ratesNotice: null,
    });
  });

  it("the home owner: £135 left over and £9,600 owed", async () => {
    // Income 3,450. Essentials 1,250 + 190 + 140 + 45 + 55 + 30 + 265 + 520 + 180 = 2,675; other
    // spending 120 + 40 + 180 = 340; savings 100 + 200 = 300. Left over 3,450 - 2,675 - 340 - 300
    // = 135. Owed: the car loan's 8,400 and the card's 1,200 = 9,600; the mortgage is not
    // consumer debt.
    expect(await stripFor("owner")).toEqual({
      first: { kind: "leftOver", figure: 135, leavesOut: null },
      second: { kind: "owed", figure: 9600 },
      collapsed: false,
      ratesNotice: null,
    });
  });

  it("renter-linked: the take-home worked out from the salary, £127 left over, no notice in 2026/27", async () => {
    const budget = BudgetEntryListResponse.parse(
      await (await (await signedInAs("renter-linked"))("/v1/budget-entries")).json(),
    );
    const income = budget.find((row) => row.isIncome);
    expect([income?.linkKind, income?.amount]).toEqual(["take_home", 0]);
    // 2026/27, salary 32,000: pension 5% = 1,600 (net pay). Tax (32,000 - 1,600 - 12,570) x 20%
    // = 3,566. NI (32,000 - 12,570) x 8% = 1,554.40. Plan 2 (32,000 - 29,385) x 9% = 235.35.
    // Take-home 32,000 - 1,600 - 3,566 - 1,554.40 - 235.35 = 25,044.25 a year, 2,087 a month.
    // Left over 2,087 - 1,615 - 195 - 150 = 127.
    expect(await stripFor("renter-linked")).toEqual({
      first: { kind: "leftOver", figure: 127, leavesOut: null },
      second: { kind: "owed", figure: 1800 },
      collapsed: false,
      ratesNotice: null,
    });
  });

  it("renter-linked in 2027/28: the same figure with the provisional rates notice", async () => {
    // 2027/28 keeps 2026/27's allowance, bands, NI and Plan 2 threshold, so 127 again.
    expect(await stripFor("renter-linked", MAY_2027)).toEqual({
      first: { kind: "leftOver", figure: 127, leavesOut: null },
      second: { kind: "owed", figure: 1800 },
      collapsed: false,
      ratesNotice: {
        calendarYear: "2027/28",
        ratesYear: "2027/28",
        isFallback: false,
        kind: "provisional",
      },
    });
  });

  it("scottish-refused: refused in 2027/28, which has no Scottish rates; a figure in 2026/27", async () => {
    expect((await stripFor("scottish-refused", MAY_2027)).first).toEqual({
      kind: "refused",
      notice:
        "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
    });
    // 2026/27 has Scottish rates: a figure, not a refusal (the device's date decides which).
    expect((await stripFor("scottish-refused")).first.kind).toBe("leftOver");
  });

  it("no-budget: the one prompt, which hides what is owed", async () => {
    const strip = await stripFor("no-budget");
    expect(strip.first).toEqual({ kind: "unset" });
    expect(strip.collapsed).toBe(true);
  });

  it("pension-only: £125 left over and the £9,000 pension, with no debt", async () => {
    // The renter's budget, so 125 as above; the one pension pot holds 9,000.
    expect(await stripFor("pension-only")).toEqual({
      first: { kind: "leftOver", figure: 125, leavesOut: null },
      second: { kind: "pension", figure: 9000 },
      collapsed: false,
      ratesNotice: null,
    });
  });

  it("the canned data has no budget, and unavailable answers 503", async () => {
    const api = await signedIn();
    expect(await (await api("/v1/budget-entries")).json()).toEqual([]);
    server.setScenario({ data: "unavailable" });
    expect((await api("/v1/budget-entries")).status).toBe(503);
  });
});

async function signedInAs(data: HomeData) {
  server.setScenario({ data });
  return signedIn();
}
