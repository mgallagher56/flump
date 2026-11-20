import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isDestructiveCall,
  MAX_RETRIES_PER_RUN,
  RETRY_WINDOW_MS,
  readRetries,
  retryEnabled,
  retryWaitMs,
} from "../apps/e2e/support/rate-limit-retry";

// E41: the e2e seeding helpers retry once after a 429 within one window, and the run fails when
// retries exceed a small allowance (apps/e2e/support/rate-limit-retry.ts, rate-limit-teardown.ts).

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

test("a Retry-After within one window is waited out, with half a second to spare", () => {
  // 12 s from the backend -> 12,500 ms.
  expect(retryWaitMs("12")).toBe(12_500);
  // 60 s is the longest that fits the 61 s window: 60,500 ms.
  expect(retryWaitMs("60")).toBe(60_500);
});

test("a longer Retry-After (the hourly destructive limit) or a missing or odd one is not waited out", () => {
  expect(retryWaitMs("61")).toBeNull(); // 61,500 ms > 61,000 ms
  expect(retryWaitMs("3600")).toBeNull();
  expect(retryWaitMs(null)).toBeNull();
  expect(retryWaitMs("soon")).toBeNull();
  expect(retryWaitMs("-5")).toBeNull();
});

test("the window and the allowance stay small", () => {
  expect(RETRY_WINDOW_MS).toBe(61_000);
  expect(MAX_RETRIES_PER_RUN).toBeLessThanOrEqual(3);
});

test("the retry log is read back one record per line, and a run with none reads empty", () => {
  const dir = mkdtempSync(join(tmpdir(), "e2e-retries-"));
  dirs.push(dir);
  const file = join(dir, "rate-limit-retries.jsonl");
  expect(readRetries(file)).toEqual([]);
  writeFileSync(
    file,
    `${JSON.stringify({ test: "a", method: "GET", path: "/accounts", waitMs: 12_500 })}\n`,
  );
  expect(readRetries(file)).toEqual([
    { test: "a", method: "GET", path: "/accounts", waitMs: 12_500 },
  ]);
});

test("only the smoke suite retries: the opt-in must be exactly 1", () => {
  expect(retryEnabled({ E2E_RATE_LIMIT_RETRY: "1" })).toBe(true);
  expect(retryEnabled({})).toBe(false);
  expect(retryEnabled({ E2E_RATE_LIMIT_RETRY: "true" })).toBe(false);
});

test("a reset or a delete is never retried, whatever the Retry-After", () => {
  expect(isDestructiveCall("POST", "/user-profile/reset-financial-data")).toBe(true);
  expect(isDestructiveCall("DELETE", "/accounts/1")).toBe(true);
  expect(isDestructiveCall("delete", "/tax-records/1")).toBe(true);
  expect(isDestructiveCall("GET", "/accounts")).toBe(false);
  expect(isDestructiveCall("POST", "/budget-entries")).toBe(false);
});
