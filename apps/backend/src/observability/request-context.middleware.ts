import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
 * Assigns a request id (a client-supplied x-request-id is kept only when it is a UUID), echoes it on the
 * response, stores it on `req.requestId`, and logs one access line when the response finishes. The line
 * carries the route template only: never the URL, query string, headers or body.
 */
export function requestContextMiddleware(req: Req, res: Res, next: () => void): void {
  const supplied = req.headers["x-request-id"];
  const requestId = typeof supplied === "string" && UUID.test(supplied) ? supplied : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  const start = process.hrtime.bigint();
  let logged = false;
  const emit = (aborted: boolean) => {
    if (logged) return;
    logged = true;
    const path = req.route?.path;
    const route = typeof path === "string" ? path : "unmatched";
    // Probes hit /health* constantly; only failed or aborted probes are worth a line.
    if (route.startsWith("/health") && res.statusCode < 400 && !aborted) return;
    logger.log({
      requestId,
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
      ...(aborted ? { aborted: true } : {}),
    });
  };
  res.once("finish", () => emit(false));
  // `close` without a prior `finish` means the client went away before the response completed.
  res.once("close", () => emit(true));
  next();
}
