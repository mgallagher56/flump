import { redactString } from "@flump/observability";
import { applyRobotsHeader } from "~/utils/indexing.server";

/**
 * `/csp-report` receiver (E20-N11). Browsers POST CSP violation reports here without a session.
 * It always answers 204 (never reveals anything, never retries), except 413 for an oversize body.
 *
 * Logged per report: the violated directive name, the blocked origin (scheme and host only) and
 * the document path (no query, no fragment). Never the raw report, a full URL, a query value,
 * `original-policy`, `script-sample` or any header.
 */

export const MAX_REPORT_BYTES = 8 * 1024;
const MAX_REPORTS_PER_BODY = 10;
export const RATE_LIMIT_MAX = 60;
export const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 5000;

/**
 * In-memory fixed-window limiter, per client key. One process, resets on deploy; good enough for a
 * write-only endpoint whose only effect is a log line. The map is bounded: expired entries are
 * dropped first, then the oldest.
 */
export class ReportRateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly max = RATE_LIMIT_MAX,
    private readonly windowMs = RATE_LIMIT_WINDOW_MS,
  ) {}

  take(key: string, now: number): boolean {
    const entry = this.windows.get(key);
    if (!entry || now - entry.start >= this.windowMs) {
      this.prune(now);
      this.windows.set(key, { start: now, count: 1 });
      return this.max >= 1;
    }
    entry.count += 1;
    return entry.count <= this.max;
  }

  private prune(now: number): void {
    if (this.windows.size < MAX_TRACKED_CLIENTS) return;
    for (const [key, entry] of this.windows) {
      if (now - entry.start >= this.windowMs) this.windows.delete(key);
    }
    while (this.windows.size >= MAX_TRACKED_CLIENTS) {
      const oldest = this.windows.keys().next();
      if (oldest.done) break;
      this.windows.delete(oldest.value);
    }
  }
}

/**
 * The client key: the last `X-Forwarded-For` entry, which is the one the single trusted proxy
 * (Railway, `trust proxy` 1 in `server/app.ts`) appended; earlier entries are client-supplied.
 * Without the header (local dev, direct access) every client shares one key. Used only to
 * rate-limit; it is never logged or stored beyond the in-memory window.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last ? last.slice(0, 64) : "unknown";
}

export interface SafeReport {
  directive: string;
  blocked: string;
  path: string;
}

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 2048) : "";
}

function directiveName(raw: string): string {
  if (/[\r\n]/.test(raw)) return "unknown";
  const first = raw.trim().split(/\s+/, 1)[0] ?? "";
  return /^[a-z][a-z0-9-]{0,39}$/.test(first) ? first : "unknown";
}

/** `blocked-uri` is a keyword (`inline`, `eval`, `data`...) or a URL; a URL is cut to scheme+host. */
function blockedOrigin(raw: string): string {
  if (raw === "") return "none";
  if (/^[a-z-]{1,24}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    const scheme = url.protocol;
    const origin = url.host ? `${scheme}//${url.host}` : scheme;
    return redactString(origin.slice(0, 120));
  } catch {
    return "invalid";
  }
}

const OPAQUE_SEGMENT = /^(?:\d+|[0-9a-f]{16,}|[A-Za-z0-9_-]{20,})$/i;

function documentPath(raw: string): string {
  if (raw === "") return "none";
  try {
    const { pathname } = new URL(raw, "http://invalid.test");
    const path = pathname
      .split("/")
      .map((segment) => (OPAQUE_SEGMENT.test(segment) ? ":id" : segment))
      .join("/");
    return redactString(path.slice(0, 200));
  } catch {
    return "invalid";
  }
}

function fromEntry(directive: unknown, blocked: unknown, document: unknown): SafeReport {
  return {
    directive: directiveName(str(directive)),
    blocked: blockedOrigin(str(blocked)),
    path: documentPath(str(document)),
  };
}

/**
 * Pulls the three safe fields out of a legacy `{"csp-report": {...}}` body, a Reporting API
 * `[{type, body}]` array (or single object) or a bare report object. Anything else yields none.
 */
export function extractReports(payload: unknown): SafeReport[] {
  const entries = Array.isArray(payload) ? payload.slice(0, MAX_REPORTS_PER_BODY) : [payload];
  const reports: SafeReport[] = [];
  for (const entry of entries) {
    if (!isObject(entry)) continue;
    if (typeof entry.type === "string" && entry.type !== "csp-violation") continue;
    const legacy = entry["csp-report"];
    if (isObject(legacy)) {
      reports.push(
        fromEntry(
          legacy["effective-directive"] || legacy["violated-directive"],
          legacy["blocked-uri"],
          legacy["document-uri"],
        ),
      );
    } else if (isObject(entry.body)) {
      reports.push(
        fromEntry(
          entry.body.effectiveDirective || entry.body.violatedDirective,
          entry.body.blockedURL,
          entry.body.documentURL ?? entry.url,
        ),
      );
    }
  }
  return reports;
}

/** Reads at most `MAX_REPORT_BYTES`; `null` when the body is larger. */
async function readCapped(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_REPORT_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REPORT_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function respond(status: 204 | 413): Response {
  return new Response(null, {
    status,
    headers: applyRobotsHeader(new Headers({ "Cache-Control": "no-store" })),
  });
}

export interface CspReportDeps {
  limiter?: ReportRateLimiter;
  now?: () => number;
  log?: (line: string) => void;
}

const defaultLimiter = new ReportRateLimiter();

export function formatReportLine(report: SafeReport): string {
  return JSON.stringify({
    level: "warn",
    context: "CspReport",
    directive: report.directive,
    blocked: report.blocked,
    path: report.path,
  });
}

/** Handles one report POST. Never throws. */
export async function handleCspReport(
  request: Request,
  {
    limiter = defaultLimiter,
    now = Date.now,
    log = (line) => console.warn(line),
  }: CspReportDeps = {},
): Promise<Response> {
  if (!limiter.take(clientKey(request), now())) return respond(204);
  let text: string | null;
  try {
    text = await readCapped(request);
  } catch {
    return respond(204);
  }
  if (text === null) return respond(413);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return respond(204);
  }
  for (const report of extractReports(payload)) log(formatReportLine(report));
  return respond(204);
}
