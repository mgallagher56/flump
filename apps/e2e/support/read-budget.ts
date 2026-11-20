import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "@playwright/test";
import { retryEnabled } from "./rate-limit-retry";

/**
 * The smoke suite's read budget. The suite runs as one test user, and the backend allows that user
 * 600 reads a minute (the "read" rate-limit class: a fixed window that starts at the first read and
 * lasts 60 s; apps/backend/src/security/rate-limit.decorator.ts). The chromium project and the
 * serial links project together make more than that, so on a fast runner a late link spec's page
 * load can be refused (E41: PRs 829 and 839). The limit is a security setting and is unchanged.
 *
 * The smoke config keeps a timestamped copy of the backend's output (BACKEND_LOG, written by
 * stamp-log.ts). From its access log this module rebuilds the user's read windows as the backend
 * counts them (with the small, deliberate over-count described at userReads), so:
 * - paceReads(), called before a link spec seeds its persona, waits for the next window when the
 *   current one is nearly spent (PACE_AT reads), instead of letting a page load be refused. It
 *   waits only on a measured count, never retries a refused request.
 * - the smoke teardown prints the backend's 429s (none should appear), the peak reads in a window,
 *   every pacing wait, and the reads each link spec made.
 */
export const BACKEND_LOG = join(import.meta.dirname, "../.e2e-logs/backend.log");
export const SPEC_MARKS = join(import.meta.dirname, "../.e2e-logs/spec-marks.jsonl");
export const READ_LIMIT = 600;
export const WINDOW_MS = 60_000;
/** Wait for a fresh window once this many reads are spent: room for one link spec's page loads. */
export const PACE_AT = 480;

export interface AccessEvent {
  at: number;
  method: string;
  route: string;
  status: number;
}

export interface Refusal {
  at: number;
  line: string;
  perUser: boolean;
}

/** Removes terminal colour codes (ESC [ ... m) without a regular expression. */
function stripColours(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 27 && text[i + 1] === "[") {
      const end = text.indexOf("m", i + 2);
      if (end > 0) {
        i = end;
        continue;
      }
    }
    out += text[i];
  }
  return out;
}

/** Parses the stamped backend log: access entries (Nest's multi-line object) and 429 lines. */
export function parseBackendLog(text: string): { access: AccessEvent[]; refusals: Refusal[] } {
  const access: AccessEvent[] = [];
  const refusals: Refusal[] = [];
  let pending: Partial<AccessEvent> | null = null;
  for (const raw of text.split("\n")) {
    const space = raw.indexOf(" ");
    if (space < 0) continue;
    const at = Number(raw.slice(0, space));
    const line = stripColours(raw.slice(space + 1));
    if (!Number.isFinite(at)) continue;
    if (line.includes("ratelimit_exceeded")) {
      refusals.push({
        at,
        line: line.slice(line.indexOf("ratelimit_exceeded")),
        perUser: line.includes("userRef="),
      });
      continue;
    }
    if (line.includes("[HttpAccess]")) {
      pending = { at };
      continue;
    }
    if (!pending) continue;
    const value = (key: string) => {
      const start = line.indexOf(`${key}: `);
      if (start < 0) return null;
      const text = line
        .slice(start + key.length + 2)
        .replaceAll("'", "")
        .trim();
      return text.endsWith(",") ? text.slice(0, -1) : text;
    };
    const method = value("method");
    if (method !== null) pending.method = method;
    const route = value("route");
    if (route !== null) pending.route = route;
    const status = value("status");
    if (status !== null) {
      pending.status = Number(status);
      if (pending.method && pending.route !== undefined) access.push(pending as AccessEvent);
      pending = null;
    }
  }
  return { access, refusals };
}

/**
 * The reads the backend counts against the user: GETs and HEADs that were not refused (a refused
 * hit burns no quota in RateLimitStore.hit), not health checks and not 401s. Deliberately a slight
 * over-count, so pacing errs early: it also counts GETs with a class of their own (receipt
 * downloads, data export), exempt /mcp paths and unauthenticated GETs that were not refused with
 * 401. OPTIONS preflights are answered by CORS before any guard, so they are left out.
 */
export function userReads(access: AccessEvent[]): number[] {
  return access
    .filter(
      (e) =>
        (e.method === "GET" || e.method === "HEAD") &&
        !e.route.startsWith("/health") &&
        e.status !== 401 &&
        e.status !== 429,
    )
    .map((e) => e.at)
    .sort((a, b) => a - b);
}

export interface ReadWindow {
  start: number;
  count: number;
}

/** Fixed windows as the backend's store counts them: one starts at the first read after the last ended. */
export function readWindows(reads: number[]): ReadWindow[] {
  const windows: ReadWindow[] = [];
  for (const at of reads) {
    const current = windows.at(-1);
    if (current && at < current.start + WINDOW_MS) current.count++;
    else windows.push({ start: at, count: 1 });
  }
  return windows;
}

function readLog(): string {
  try {
    return existsSync(BACKEND_LOG) ? readFileSync(BACKEND_LOG, "utf8") : "";
  } catch {
    return "";
  }
}

/** Records which link spec starts now, so the teardown can count each spec's reads. */
function markSpec(title: string, waitedMs: number): void {
  mkdirSync(dirname(SPEC_MARKS), { recursive: true });
  appendFileSync(SPEC_MARKS, `${JSON.stringify({ at: Date.now(), title, waitedMs })}\n`);
}

/**
 * Before a link spec seeds: if the user's current read window already holds PACE_AT reads, wait
 * until it ends (adding the wait to the test's time limit). Smoke suite only.
 */
export async function paceReads(): Promise<void> {
  if (!retryEnabled()) return;
  let title = "global setup";
  try {
    title = test.info().titlePath.join(" > ");
  } catch {
    return; // Outside a test: global setup seeds before any window matters.
  }
  const windows = readWindows(userReads(parseBackendLog(readLog()).access));
  const current = windows.at(-1);
  const now = Date.now();
  let waitedMs = 0;
  if (current && now < current.start + WINDOW_MS && current.count >= PACE_AT) {
    waitedMs = current.start + WINDOW_MS - now + 250;
    test.info().setTimeout(test.info().timeout + waitedMs);
    await new Promise((resolve) => setTimeout(resolve, waitedMs));
  }
  markSpec(title, waitedMs);
}

export interface SpecReads {
  title: string;
  reads: number;
  waitedMs: number;
}

/** Each marked spec's reads: those between its mark and the next. */
export function readsPerSpec(reads: number[], marksText: string): SpecReads[] {
  const marks = marksText
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { at: number; title: string; waitedMs: number });
  return marks.map((m, i) => {
    const end = marks[i + 1]?.at ?? Number.POSITIVE_INFINITY;
    return {
      title: m.title,
      reads: reads.filter((at) => at >= m.at && at < end).length,
      waitedMs: m.waitedMs,
    };
  });
}

/**
 * Reads the backend refused that no seeding retry accounts for (rate-limit-retry.ts retries a
 * refused seeding call once and logs it). Any such refusal is a page or API read the suite leaned on
 * the limit for, and fails the run. Writes are not counted here: the write and destructive limits
 * have their own guards.
 */
export function unexplainedReadRefusals(refusals: Refusal[], retriedReads: number): Refusal[] {
  const reads = refusals.filter((r) => {
    const route = r.line.split("route=")[1] ?? "";
    return route.startsWith("GET ") || route.startsWith("HEAD ");
  });
  return reads.slice(Math.max(0, retriedReads));
}
