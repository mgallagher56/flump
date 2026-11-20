import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "@playwright/test";
import { retryEnabled } from "./rate-limit-retry";

/**
 * Counts the smoke suite's destructive calls: financial data resets and deletes. The backend allows
 * 10 an hour per user (the "destructive" rate-limit class), shared by every reset and delete, and
 * the suite runs as one user, so a fresh run must stay well inside it. The limit is unchanged.
 *
 * Every helper that resets or deletes records the call here (applyPersona's reset, clearToNewUser,
 * backendCall with DELETE, and the links api and pageApi helpers for a reset or DELETE). The smoke
 * run's teardown (rate-limit-teardown.ts) prints the count beside the 429 retries and fails the run
 * above MAX_DESTRUCTIVE_PER_RUN, so a new spec that adds resets or deletes is caught in its own PR.
 *
 * Only the smoke suite counts (the same opt-in as the 429 retry); the other suites run against
 * their own databases and do not read the log.
 */
export const MAX_DESTRUCTIVE_PER_RUN = 6;
export const DESTRUCTIVE_LOG = join(import.meta.dirname, "../test-results/destructive-calls.jsonl");

export interface DestructiveRecord {
  test: string;
  method: string;
  path: string;
}

/** A reset or a delete: the calls that spend the 10-an-hour destructive budget. */
export function isDestructive(method: string, path: string): boolean {
  return (
    method.toUpperCase() === "DELETE" ||
    path.replace(/^\/api/, "").startsWith("/user-profile/reset-financial-data")
  );
}

/** Records one destructive call (attempted, whether or not the backend accepted it). */
export function recordDestructive(method: string, path: string): void {
  if (!retryEnabled() || !isDestructive(method, path)) return;
  let title = "global setup";
  try {
    title = test.info().titlePath.join(" > ");
  } catch {
    // Outside a test.
  }
  const record: DestructiveRecord = { test: title, method: method.toUpperCase(), path };
  mkdirSync(dirname(DESTRUCTIVE_LOG), { recursive: true });
  appendFileSync(DESTRUCTIVE_LOG, `${JSON.stringify(record)}\n`);
}

/** The destructive calls this run logged. */
export function readDestructive(file: string = DESTRUCTIVE_LOG): DestructiveRecord[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as DestructiveRecord);
}
