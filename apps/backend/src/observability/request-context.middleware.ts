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
  once(event: "finish", cb: () => void): unknown;
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
  res.once("finish", () => {
    logger.log({
      requestId,
      method: req.method,
      route: req.route?.path ?? "unmatched",
      status: res.statusCode,
      durationMs: Math.round(Number(process.hrtime.bigint() - start) / 1e5) / 10,
    });
  });
  next();
}
