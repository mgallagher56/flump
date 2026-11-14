import { redactString } from "@flump/observability";
import type { NextFunction, Request, Response } from "express";
import {
  REQUEST_ID_HEADER,
  resolveRequestId,
  runWithRequestId,
} from "../app/security/request-id.server";

export { resolveRequestId };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DIGITS_SEGMENT = /^\d+$/;
const TOKEN_SEGMENT = /^[A-Za-z0-9_-]{20,}$/;
const HEX_SEGMENT = /^[0-9a-f]{12,}$/i;
// By design every segment of 20+ characters collapses, including long kebab-case slugs: a
// passphrase-style segment (`correct-horse-battery-staple`) is indistinguishable from one, and
// short static route names (/app/budget, /login) stay readable.
const SCHEME_AUTHORITY = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i;

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
      TOKEN_SEGMENT.test(segment)
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
 * the source (`REQUEST_ID_PATTERN` or a fresh UUID), and the scrubber would blank it (it looks like a token).
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
 * never the query, headers or body. The id is echoed as `x-request-id`, and the rest of the
 * request runs inside `runWithRequestId` so `getRequestId()` returns it to every backend call the
 * request makes (BE-07, M14).
 */
export function accessLog({ json, write = (line) => console.log(line) }: AccessLogOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = resolveRequestId(req.headers);
    res.setHeader(REQUEST_ID_HEADER, requestId);
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
    // req.ip honours `trust proxy` (set before this middleware in app.ts): the browser's address
    // behind Railway's edge. Held for the signed client-IP header on backend calls (M9).
    runWithRequestId(requestId, () => next(), req.ip ? { clientIp: req.ip } : {});
  };
}
