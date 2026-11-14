import { AsyncResource } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";
import { runInRequestScope } from "./report";
import { isSafeRequestId, runWithRequestContext } from "./request-context";

const logger = new Logger("HttpAccess");

interface Req {
  method: string;
  route?: { path?: string };
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
}
interface Res {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  once(event: "finish" | "close", cb: () => void): unknown;
}

/**
 * Assigns a request id (a client-supplied x-request-id is kept only when it matches
 * REQUEST_ID_PATTERN, otherwise a UUID is generated), echoes it on the response, stores it on
 * `req.requestId` and in AsyncLocalStorage for the rest of the request (so every log line and
 * Sentry event carries it), and logs one access line when the response finishes. The line carries
 * the route template only: never the URL, query string, headers or body.
 */
export function requestContextMiddleware(req: Req, res: Res, next: () => void): void {
  const supplied = req.headers["x-request-id"];
  const requestId = isSafeRequestId(supplied) ? supplied : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  runWithRequestContext({ requestId }, () =>
    runInRequestScope(requestId, (scope) => handle(req, res, next, requestId, scope.finish)),
  );
}

function handle(
  req: Req,
  res: Res,
  next: () => void,
  requestId: string,
  finishScope: (name: string, status: number) => void,
): void {
  const start = process.hrtime.bigint();
  let logged = false;
  const emit = (aborted: boolean) => {
    if (logged) return;
    logged = true;
    const path = req.route?.path;
    const route = typeof path === "string" ? path : "unmatched";
    // Probes hit /health* constantly: no trace, and only failed or aborted probes are worth a line.
    const probe = route.startsWith("/health");
    if (!probe) finishScope(`${req.method} ${route}`, res.statusCode);
    if (probe && res.statusCode < 400 && !aborted) return;
    logger.log({
      requestId,
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
      ...(aborted ? { aborted: true } : {}),
    });
  };
  // Bound so the access line is written inside this request's context (the socket emits these
  // events from its own async context).
  res.once(
    "finish",
    AsyncResource.bind(() => emit(false)),
  );
  // `close` without a prior `finish` means the client went away before the response completed.
  res.once(
    "close",
    AsyncResource.bind(() => emit(true)),
  );
  next();
}
