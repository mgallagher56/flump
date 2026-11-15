/**
 * Backend load smoke (backend audit 2026-11, finding M23): a fixed-rate run of the main read
 * routes against a backend on this machine, with latency percentiles checked against the budget
 * in budget.json. See scripts/load/README.md for how to run it and what it does not measure.
 *
 * It only ever targets a loopback host (assertLocalTarget in lib.ts): never production, staging
 * or a Railway address. The backend must be in development mode with the dev sign-in bypass, the
 * way the E2E suite runs it; that mode cannot start on Railway (apps/backend/src/auth/auth.config.ts).
 *
 * Environment:
 *   LOAD_BASE_URL     backend origin, default http://127.0.0.1:4100
 *   LOAD_AUTH_TOKEN   the dev bypass bearer token (required; not a secret, it only works in dev mode)
 *   LOAD_RATE         authenticated requests a second, default 4
 *   LOAD_HEALTH_RATE  /health/ready requests a second, default 10
 *   LOAD_DURATION_S   seconds, default 45
 *   LOAD_OUTPUT       where to write the JSON result, default load-smoke-result.json
 *
 * Exit codes: 0 within budget, 1 over budget, 2 refused or could not run.
 */
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertLocalTarget,
  type Budget,
  budgetBreaches,
  planProblem,
  type Sample,
  summarise,
  summaryMarkdown,
} from "./lib";

const REQUEST_TIMEOUT_MS = 10_000;

/** Authenticated read routes, sent round-robin. Each is a page the web app loads. */
const READ_ROUTES = [
  "/user-profile",
  "/accounts",
  "/account-details",
  "/portfolio-snapshot",
  "/budget-entries",
  "/tax-records",
] as const;
const HEALTH_ROUTE = "/health/ready";

/** Rows written once so the reads return real data. Neutral sample figures. */
const SEED_ACCOUNTS = [
  { name: "Load current account", type: "Current", balance: 2400 },
  { name: "Load savings", type: "Saving", balance: 8200, interestRate: 4 },
  { name: "Load home", type: "Property", balance: 250000 },
  { name: "Load pension", type: "Pension", balance: 64000, monthlyContribution: 400 },
  { name: "Load credit card", type: "Credit Card", balance: 900, interestRate: 22 },
  { name: "Load loan", type: "Loan", balance: 5200, interestRate: 7, monthlyContribution: 180 },
] as const;
const SEED_BUDGET = Array.from({ length: 20 }, (_, i) => ({
  name: `Load entry ${i + 1}`,
  category: i % 2 === 0 ? "Housing" : "Food",
  amount: 40 + i * 5,
  frequency: "monthly",
  isIncome: false,
  isEssential: i % 2 === 0,
}));

function fail(message: string): never {
  console.error(`load-smoke: ${message}`);
  process.exit(2);
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) fail(`${name} is not a number`);
  return value;
}

let base: URL;
try {
  base = assertLocalTarget(process.env.LOAD_BASE_URL ?? "http://127.0.0.1:4100");
} catch (error) {
  fail((error as Error).message);
}
const token = process.env.LOAD_AUTH_TOKEN;
if (!token) fail("LOAD_AUTH_TOKEN is not set (the dev bypass token; see scripts/load/README.md)");

const rate = numberFromEnv("LOAD_RATE", 4);
const healthRate = numberFromEnv("LOAD_HEALTH_RATE", 10);
const durationSeconds = numberFromEnv("LOAD_DURATION_S", 45);
const problem = planProblem({ authenticatedPerSecond: rate, durationSeconds });
if (problem) fail(problem);
if (!(healthRate > 0) || healthRate > 50) fail("LOAD_HEALTH_RATE must be between 1 and 50");

const { budget } = JSON.parse(readFileSync(resolve(import.meta.dir, "budget.json"), "utf8")) as {
  budget: Budget;
};

async function call(
  route: string,
  init: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<{ status: number; ms: number; json: unknown }> {
  const started = performance.now();
  try {
    const response = await fetch(new URL(route, base), {
      method: init.method ?? "GET",
      headers: {
        ...(init.auth === false ? {} : { Authorization: `Bearer ${token}` }),
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      // A redirect could lead off this machine, so it is an error, never followed.
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // Not JSON: the status is all the caller needs.
    }
    return { status: response.status, ms: performance.now() - started, json };
  } catch {
    return { status: 0, ms: performance.now() - started, json: null };
  }
}

async function waitUntilReady(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    if ((await call(HEALTH_ROUTE, { auth: false })).status === 200) return;
    await Bun.sleep(1000);
  }
  fail(`${base.origin}${HEALTH_ROUTE} did not answer 200 within 60 seconds`);
}

/** Idempotent: writes the sample rows only when the dev user has none of them. */
async function seed(): Promise<void> {
  const accounts = await call("/accounts");
  if (accounts.status !== 200) fail(`GET /accounts answered ${accounts.status} before the run`);
  const existing = Array.isArray(accounts.json) ? (accounts.json as { name?: string }[]) : [];
  if (existing.some((a) => a.name === SEED_ACCOUNTS[0].name)) return;
  const writes: Promise<{ status: number }>[] = [];
  const failures: string[] = [];
  const write = async (route: string, method: string, body: unknown) => {
    const { status } = await call(route, { method, body });
    if (status < 200 || status >= 300) failures.push(`${method} ${route} ${status}`);
    return { status };
  };
  await write("/user-profile", "PATCH", {
    firstName: "Load",
    employmentType: "employed",
    annualSalary: 42000,
    taxRegion: "ENGLAND",
    onboardingCompleted: true,
  });
  for (const account of SEED_ACCOUNTS) writes.push(write("/accounts", "POST", account));
  for (const entry of SEED_BUDGET) writes.push(write("/budget-entries", "POST", entry));
  await Promise.all(writes);
  if (failures.length > 0) fail(`seeding failed: ${failures.join(", ")}`);
}

/** Open loop: requests leave on a fixed timetable whether or not earlier ones have answered. */
async function run(): Promise<Sample[]> {
  const samples: Sample[] = [];
  const inFlight: Promise<void>[] = [];
  const send = (route: string, auth: boolean) => {
    inFlight.push(
      call(route, { auth }).then(({ status, ms }) => {
        samples.push({ route: `GET ${route}`, status, ms });
      }),
    );
  };
  const started = performance.now();
  const endAt = started + durationSeconds * 1000;
  let nextRead = started;
  let nextHealth = started;
  let readIndex = 0;
  while (performance.now() < endAt) {
    const now = performance.now();
    if (now >= nextRead) {
      send(READ_ROUTES[readIndex++ % READ_ROUTES.length] as string, true);
      nextRead += 1000 / rate;
    }
    if (now >= nextHealth) {
      send(HEALTH_ROUTE, false);
      nextHealth += 1000 / healthRate;
    }
    await Bun.sleep(Math.max(1, Math.min(nextRead, nextHealth) - performance.now()));
  }
  await Promise.all(inFlight);
  return samples;
}

await waitUntilReady();
await seed();
// One unrecorded pass, so the first measured request is not also the first query on a cold pool.
for (const route of READ_ROUTES) {
  const { status } = await call(route);
  if (status !== 200) fail(`GET ${route} answered ${status} before the run`);
}

console.log(
  `load-smoke: ${rate}/s authenticated reads and ${healthRate}/s ${HEALTH_ROUTE} for ${durationSeconds}s against ${base.origin}`,
);
const samples = await run();
const summary = summarise(samples);
const breaches = budgetBreaches(summary, budget);
const markdown = summaryMarkdown(summary, budget, breaches);
console.log(markdown);

const output = process.env.LOAD_OUTPUT ?? "load-smoke-result.json";
writeFileSync(
  output,
  `${JSON.stringify({ plan: { rate, healthRate, durationSeconds }, budget, summary, breaches }, null, 2)}\n`,
);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);

if (breaches.length > 0) {
  for (const breach of breaches) console.error(`load-smoke: over budget: ${breach}`);
  process.exit(1);
}
console.log("load-smoke: within budget");
