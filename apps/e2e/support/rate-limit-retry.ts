import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Page, test } from "@playwright/test";

/**
 * Honours the backend's Retry-After in the two seeding helpers (applyPersona and the links
 * pageApi), as a well-mannered client would. The smoke suite runs as one test user and makes about
 * 900 reads; the backend allows 600 reads a minute per user, and a fast runner fits the chromium
 * and links projects into one minute, so a late seeding call can be refused with 429 even though no
 * test is wrong. The limits are unchanged.
 *
 * Rules (E41, coordinator sign-off 19 November 2026):
 * - Only in the smoke suite: playwright.config.ts opts in (E2E_RATE_LIMIT_RETRY). The visual,
 *   sweep, phone and interaction suites do not retry: a 429 there fails as before.
 * - One retry per call, only for a 429 whose Retry-After is within one minute's window
 *   (RETRY_WINDOW_MS). A reset or a delete is never retried (they spend the 10-an-hour
 *   destructive budget), whatever the Retry-After.
 * - Only around a seeding or set-up call, never around an assertion.
 * - Every retry is logged (RETRY_LOG) and counted after the run (rate-limit-teardown.ts). The run
 *   fails above MAX_RETRIES_PER_RUN, so a real rise in request volume cannot hide behind retries.
 * - The wait is added to the test's own time limit, so it never counts against it.
 */
export const RETRY_WINDOW_MS = 61_000;
export const MAX_RETRIES_PER_RUN = 3;
export const RETRY_LOG = join(import.meta.dirname, "../test-results/rate-limit-retries.jsonl");
export const RATE_LIMIT_BINDING = "__e2eRateLimited";
export const RETRY_OPT_IN_ENV = "E2E_RATE_LIMIT_RETRY";

export interface RetryRecord {
  test: string;
  method: string;
  path: string;
  waitMs: number;
}

/** Whether this suite retries at all (set by the smoke config only). */
export const retryEnabled = (env: NodeJS.ProcessEnv = process.env) => env[RETRY_OPT_IN_ENV] === "1";

/** How long to wait for a Retry-After value, or null when it should not be waited out. */
export function retryWaitMs(
  retryAfter: string | null,
  windowMs: number = RETRY_WINDOW_MS,
): number | null {
  // Whole seconds only (the backend sends an integer); parsed without a regex.
  const seconds = retryAfter === null || retryAfter.trim() === "" ? Number.NaN : Number(retryAfter);
  if (!Number.isInteger(seconds) || seconds < 0) return null;
  const waitMs = seconds * 1000 + 500;
  return waitMs <= windowMs ? waitMs : null;
}

/** Calls that spend the destructive budget are never retried. */
export function isDestructiveCall(method: string, path: string): boolean {
  return method.toUpperCase() === "DELETE" || path.startsWith("/user-profile/reset-financial-data");
}

/**
 * Decides one 429: the wait in milliseconds, or null for no retry. Logs the retry and extends the
 * current test's time limit by the wait.
 */
export function onRateLimited(
  method: string,
  path: string,
  retryAfter: string | null,
): number | null {
  if (isDestructiveCall(method, path)) return null;
  const waitMs = retryWaitMs(retryAfter);
  if (waitMs === null) return null;
  let title = "global setup";
  try {
    const info = test.info();
    title = info.titlePath.join(" > ");
    info.setTimeout(info.timeout + waitMs);
  } catch {
    // Outside a test (global setup): nothing to extend.
  }
  const record: RetryRecord = { test: title, method, path, waitMs };
  mkdirSync(dirname(RETRY_LOG), { recursive: true });
  appendFileSync(RETRY_LOG, `${JSON.stringify(record)}\n`);
  return waitMs;
}

const exposed = new WeakSet<Page>();

/**
 * Lets the page's seeding code ask, on a 429, whether to wait and retry once. Returns the binding
 * name to pass into page.evaluate, or "" when this suite does not retry.
 */
export async function allowRateLimitRetry(page: Page): Promise<string> {
  if (!retryEnabled()) return "";
  if (!exposed.has(page)) {
    await page.exposeFunction(RATE_LIMIT_BINDING, onRateLimited);
    exposed.add(page);
  }
  return RATE_LIMIT_BINDING;
}

/** The retries this run logged (empty when there were none). */
export function readRetries(file: string = RETRY_LOG): RetryRecord[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RetryRecord);
}
