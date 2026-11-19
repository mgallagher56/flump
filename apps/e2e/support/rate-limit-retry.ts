import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { type Page, test } from "@playwright/test";

/**
 * Honours the backend's Retry-After in the two seeding helpers (applyPersona and the links
 * pageApi), as a well-mannered client would. The suite has one test user, and the backend's
 * per-user limits (reads and writes a minute) count every project as that user, so a burst of
 * seeding can be refused with 429 even though no test is wrong. The limits are unchanged.
 *
 * Rules (E41, coordinator sign-off 19 November 2026):
 * - One retry per call, only for a 429 whose Retry-After is within one minute's window
 *   (RETRY_WINDOW_MS). A longer Retry-After (the 10-an-hour destructive limit) is not waited out:
 *   the call fails as before.
 * - Only around a seeding or set-up call, never around an assertion.
 * - Every retry is logged (RETRY_LOG) and counted after the run (rate-limit-teardown.ts). The run
 *   fails above MAX_RETRIES_PER_RUN, so a real rise in request volume cannot hide behind retries.
 * - The wait is added to the test's own time limit, so it never counts against it.
 */
export const RETRY_WINDOW_MS = 61_000;
export const MAX_RETRIES_PER_RUN = 3;
export const RETRY_LOG = join(import.meta.dirname, "../test-results/rate-limit-retries.jsonl");
export const RATE_LIMIT_BINDING = "__e2eRateLimited";

export interface RetryRecord {
  test: string;
  method: string;
  path: string;
  waitMs: number;
}

const exposed = new WeakSet<Page>();

/** Lets the page's seeding code report a 429 before it waits and retries once. */
export async function allowRateLimitRetry(page: Page): Promise<void> {
  if (exposed.has(page)) return;
  exposed.add(page);
  await page.exposeFunction(RATE_LIMIT_BINDING, (method: string, path: string, waitMs: number) => {
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
  });
}

/** The retries this run logged (empty when there were none). */
export function readRetries(file: string = RETRY_LOG): RetryRecord[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as RetryRecord);
}

/** How long to wait for a Retry-After value, or null when it should not be waited out. */
export function retryWaitMs(retryAfter: string | null, windowMs: number = RETRY_WINDOW_MS) {
  if (retryAfter === null || !/^\d{1,6}$/.test(retryAfter)) return null;
  const waitMs = Number(retryAfter) * 1000 + 500;
  return waitMs <= windowMs ? waitMs : null;
}
