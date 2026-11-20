import { expect, test } from "bun:test";
import {
  PACE_AT,
  parseBackendLog,
  READ_LIMIT,
  readsPerSpec,
  readWindows,
  userReads,
} from "../apps/e2e/support/read-budget";

// E41: the smoke suite rebuilds the test user's read windows from the backend's access log, paces
// link specs when a window is nearly spent and prints the backend's 429s
// (apps/e2e/support/read-budget.ts).

const entry = (at: number, method: string, route: string, status: number) =>
  [
    `${at} [Nest] 1  - 11/20/2026, 1:00:00 PM     LOG [HttpAccess] [rid:x] Object(5) {`,
    `${at} [backend]   requestId: 'x',`,
    `${at}   method: '${method}',`,
    `${at}   route: '${route}',`,
    `${at}   status: ${status},`,
    `${at}   durationMs: 3.1`,
    `${at} }`,
  ].join("\n");

test("parses access entries and both kinds of 429 line", () => {
  const log = [
    entry(1000, "GET", "/accounts", 200),
    entry(1100, "PATCH", "/budget-entries/:id", 200),
    `1200 [Nest] 1 - WARN [RateLimit] ratelimit_exceeded route=GET /accounts userRef=ab12 retryAfter=3`,
    `1300 [Nest] 1 - WARN [RateLimit] ratelimit_exceeded route=GET /accounts retryAfter=9`,
  ].join("\n");
  const { access, refusals } = parseBackendLog(log);
  expect(access).toEqual([
    { at: 1000, method: "GET", route: "/accounts", status: 200 },
    { at: 1100, method: "PATCH", route: "/budget-entries/:id", status: 200 },
  ]);
  expect(refusals.map((r) => r.perUser)).toEqual([true, false]);
});

test("colour codes in the backend's output do not break parsing", () => {
  const esc = String.fromCharCode(27);
  const log = entry(1000, "GET", "/accounts", 200).replace(
    "method:",
    `${esc}[33mmethod:${esc}[39m`,
  );
  expect(parseBackendLog(log).access).toEqual([
    { at: 1000, method: "GET", route: "/accounts", status: 200 },
  ]);
});

test("only authenticated reads count: no health checks, no 401s, no writes", () => {
  const access = [
    { at: 1, method: "GET", route: "/accounts", status: 200 },
    { at: 2, method: "GET", route: "/health/ready", status: 200 },
    { at: 3, method: "GET", route: "/user-profile", status: 401 },
    { at: 4, method: "POST", route: "/accounts", status: 201 },
    { at: 5, method: "GET", route: "/budget-entries", status: 429 },
  ];
  // The refused read still counted against the window before it was refused.
  expect(userReads(access)).toEqual([1, 5]);
});

test("windows start at the first read after the last one ended, as the backend's store counts", () => {
  // Reads at 0, 30 s and 59.999 s share one window; 60 s starts the next (0 + 60,000 is not < 60,000).
  expect(readWindows([0, 30_000, 59_999, 60_000, 61_000, 130_000])).toEqual([
    { start: 0, count: 3 },
    { start: 60_000, count: 2 },
    { start: 130_000, count: 1 },
  ]);
});

test("each spec's reads run from its mark to the next spec's mark", () => {
  const marks = [
    JSON.stringify({ at: 100, title: "L33", waitedMs: 0 }),
    JSON.stringify({ at: 200, title: "L59", waitedMs: 12_000 }),
  ].join("\n");
  expect(readsPerSpec([50, 120, 150, 210, 260, 900], marks)).toEqual([
    { title: "L33", reads: 2, waitedMs: 0 },
    { title: "L59", reads: 3, waitedMs: 12_000 },
  ]);
});

test("pacing starts with room left for a link spec, inside the backend's limit", () => {
  expect(READ_LIMIT).toBe(600);
  expect(PACE_AT).toBeLessThan(READ_LIMIT);
  expect(READ_LIMIT - PACE_AT).toBeGreaterThanOrEqual(100);
});
