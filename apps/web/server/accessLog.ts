import { randomUUID } from "node:crypto";
import { redactString } from "@flump/observability";
import type { NextFunction, Request, Response } from "express";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// x-railway-request-id style ids: short, URL-safe, no whitespace or separators.
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

const DIGITS_SEGMENT = /^\d+$/;
const TOKEN_SEGMENT = /^[A-Za-z0-9_-]{20,}$/;
const HEX_SEGMENT = /^[0-9a-f]{12,}$/i;
// A real slug: lowercase words joined by single hyphens, no digits, under 32 characters (the
// length at which `redactString` blanks anything token-like anyway, so it stays the backstop).
// Without this, /tools/mortgage-overpayment-calculator would log as /tools/:id.
const SLUG_SEGMENT = /^[a-z]+(?:-[a-z]+)+$/;
const MAX_SLUG_LENGTH = 31;
const SCHEME_AUTHORITY = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i;

/** A UUID x-request-id is kept; otherwise a strict-charset x-railway-request-id; else a fresh UUID. */
export function resolveRequestId(headers: Request["headers"]): string {
  const supplied = headers["x-request-id"];
  if (typeof supplied === "string" && UUID.test(supplied)) return supplied;
  const railway = headers["x-railway-request-id"];
  if (typeof railway === "string" && SAFE_ID.test(railway)) return railway;
  return randomUUID();
}

/**
 * The path with the query string and fragment removed and dynamic-looking segments (UUIDs,
 * digits, long tokens, long hex) collapsed to `:id`. The query is never logged: OAuth callbacks
 * carry `code` and `state` in it. React Router's route template is not available at the Express
 * layer, so this stands in for it.
 */
export function normalisePath(url: string): string {
  // Absolute-form request targets (`GET http://user:pass@host/x`) carry credentials in the
  // authority; drop scheme and authority first.
  const raw = url.replace(SCHEME_AUTHORITY, "").split(/[?#]/, 1)[0] || "/";
  const segments = raw.split("/").map((segment) => {
    if (segment === "") return segment;
    if (
      UUID.test(segment) ||
      DIGITS_SEGMENT.test(segment) ||
      HEX_SEGMENT.test(segment) ||
      (TOKEN_SEGMENT.test(segment) &&
        !(SLUG_SEGMENT.test(segment) && segment.length <= MAX_SLUG_LENGTH))
    ) {
      return ":id";
    }
    return segment;
  });
  const joined = segments.join("/");
  return joined === "" ? "/" : joined.slice(0, 200);
}

export interface AccessLogOptions {
  json: boolean;
  write?: (line: string) => void;
}

export interface AccessLogEntry {
  requestId: string;
  method: string;
  route: string;
  status: number;
  durationMs: number;
  aborted?: boolean;
}

/** Successful probes and hashed static assets would drown the log; failures and aborts are kept. */
function isQuiet(route: string, status: number): boolean {
  if (status >= 400) return false;
  return route === "/healthz" || route.startsWith("/assets/");
}

/**
 * Defence in depth: the free-text fields (method, route) go through `redactString` even though the
 * route is already query-free and collapsed. The request id is not scrubbed: it is validated at
 * the source (UUID or a strict charset), and the scrubber would blank it (it looks like a token).
 */
export function formatLine(entry: AccessLogEntry, json: boolean): string {
  const safe = {
    ...entry,
    method: redactString(entry.method),
    route: redactString(entry.route),
  };
  return json
    ? JSON.stringify({ level: "info", context: "HttpAccess", ...safe })
    : `${safe.method} ${safe.route} ${safe.status} ${safe.durationMs}ms ${safe.requestId}${safe.aborted ? " aborted" : ""}`;
}

/**
 * Request id plus one access line per response (replaces morgan("tiny"), which printed raw URLs
 * with query strings). Logs the method, the normalised path, status, duration and request id;
 * never the query, headers or body. The id is echoed as `x-request-id`.
 */
export function accessLog({ json, write = (line) => console.log(line) }: AccessLogOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = resolveRequestId(req.headers);
    res.setHeader("x-request-id", requestId);
    const start = process.hrtime.bigint();
    const route = normalisePath(req.originalUrl);
    let logged = false;
    const emit = (aborted: boolean) => {
      if (logged) return;
      logged = true;
      if (!aborted && isQuiet(route, res.statusCode)) return;
      write(
        formatLine(
          {
            requestId,
            method: req.method,
            route,
            status: res.statusCode,
            durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
            ...(aborted ? { aborted: true } : {}),
          },
          json,
        ),
      );
    };
    res.once("finish", () => emit(false));
    res.once("close", () => emit(true));
    next();
  };
}
