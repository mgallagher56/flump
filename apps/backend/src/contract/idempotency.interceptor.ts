import { createHash, timingSafeEqual } from "node:crypto";
import {
  findRoute,
  IDEMPOTENCY_KEY_TTL_HOURS,
  IDEMPOTENT_REPLAYED_HEADER,
  IdempotencyKey as IdempotencyKeyHeader,
  isIdempotentRoute,
  type RouteDefinition,
  successStatusOf,
} from "@flump/api-contract";
import {
  BadRequestException,
  type CallHandler,
  ConflictException,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { catchError, from, mergeMap, type Observable, of, throwError } from "rxjs";
import type { DataSource } from "typeorm";

/**
 * `Idempotency-Key` on create POSTs (BE-09, audit M7). A client that retries a create with the
 * same key gets the first response back instead of a second row:
 *
 * - first use: a pending row is inserted under the unique (user, route, key) constraint, the
 *   handler runs, and its status, body and REPLAYED_HEADERS (ETag, Location) are stored; if the
 *   handler fails the row is deleted so the client can retry;
 * - same key, same body: the stored body and headers are replayed with `Idempotent-Replayed: true`.
 *   The status needs no replay: Nest sends the route's own success status, which is the stored one
 *   (`status_code` records it and marks the row as complete);
 * - same key, different body: 422 `idempotency_key_reused`;
 * - same key while the first request is still running: 409 `conflict`.
 *
 * Keys expire after IDEMPOTENCY_KEY_TTL_HOURS and a pending row older than PENDING_TIMEOUT_SECONDS
 * (a crashed request) is treated as abandoned. Every claim first deletes the caller's own expired
 * rows (any route, bounded to that user) and an abandoned row for this key. A financial data reset
 * deletes the user's rows too (UserProfileService.resetFinancialData).
 * Requests without the header behave exactly as before. Runs after the contract interceptor, so
 * the hash is over the parsed (canonical) body.
 */

/** A pending row older than this is a request that died before storing its result. */
const PENDING_TIMEOUT_SECONDS = 300;

/** Response headers stored with the result and set again on a replay. Lower case. */
const REPLAYED_HEADERS = ["etag", "location"] as const;

interface RequestLike {
  method?: string;
  route?: { path?: unknown };
  headers?: Record<string, unknown>;
  body?: unknown;
  user?: { id?: unknown };
}

interface ResponseLike {
  setHeader(name: string, value: string): unknown;
  getHeader?(name: string): unknown;
}

interface StoredRow {
  request_hash: string;
  status_code: number | null;
  response_body: unknown;
  response_headers: Record<string, string> | null;
}

/** The REPLAYED_HEADERS the handler set on `res`, as strings. */
const replayedHeadersOf = (res: ResponseLike): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const name of REPLAYED_HEADERS) {
    const value = res.getHeader?.(name);
    if (typeof value === "string" || typeof value === "number") out[name] = String(value);
  }
  return out;
};

/** JSON with object keys sorted at every level, so equal bodies hash equally. */
export function canonicalJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

export const requestHash = (body: unknown): string =>
  createHash("sha256")
    .update(canonicalJson(body ?? {}))
    .digest("hex");

const headerValue = (req: RequestLike): string | undefined => {
  const raw = req.headers?.["idempotency-key"];
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw.join(",") : String(raw);
};

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger("Idempotency");

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();
    const http = context.switchToHttp();
    const req = http.getRequest<RequestLike>();
    const key = headerValue(req);
    if (key === undefined) return next.handle();
    const route = this.routeOf(req);
    const userId = typeof req.user?.id === "string" ? req.user.id : undefined;
    if (!route || !isIdempotentRoute(route) || !userId) return next.handle();
    if (!IdempotencyKeyHeader.safeParse(key).success) {
      throw new BadRequestException({
        code: "validation_failed",
        message: "Request failed validation",
        issues: [
          {
            path: "headers.idempotency-key",
            code: "invalid_string",
            message: "must be 1 to 255 printable ASCII characters",
          },
        ],
      });
    }
    const res = http.getResponse<ResponseLike>();
    const hash = requestHash(req.body);
    const ids = { userId, routeId: route.id, key };
    return from(this.claim(ids, hash)).pipe(
      mergeMap((stored) => {
        if (stored) {
          res.setHeader(IDEMPOTENT_REPLAYED_HEADER, "true");
          for (const [name, value] of Object.entries(stored.response_headers ?? {})) {
            if ((REPLAYED_HEADERS as readonly string[]).includes(name)) res.setHeader(name, value);
          }
          return of(stored.response_body);
        }
        return next.handle().pipe(
          mergeMap((body) =>
            from(this.complete(ids, successStatusOf(route), body, replayedHeadersOf(res))).pipe(
              mergeMap(() => of(body)),
            ),
          ),
          catchError((error: unknown) =>
            from(this.release(ids)).pipe(mergeMap(() => throwError(() => error))),
          ),
        );
      }),
    );
  }

  private routeOf(req: RequestLike): RouteDefinition | undefined {
    const path = typeof req.route?.path === "string" ? req.route.path.replace(/^\//, "") : null;
    if (path === null || !req.method) return undefined;
    return findRoute(req.method.toUpperCase(), path);
  }

  /**
   * Takes the key for this request, or returns the stored result to replay. Throws 409 while
   * another request holds the key and 422 when the key was used with another body.
   */
  private async claim(
    ids: { userId: string; routeId: string; key: string },
    hash: string,
  ): Promise<StoredRow | null> {
    const params = [ids.userId, ids.routeId, ids.key];
    // Expired results count as unused, and are deleted for every route of this user (bounded to
    // the user, served by the unique index's leading user_id); an abandoned pending row of this
    // key counts as unused too.
    await this.dataSource.query(
      `DELETE FROM "idempotency_keys"
       WHERE "user_id" = $1
         AND ("created_at" < now() - make_interval(hours => $4)
              OR ("route_id" = $2 AND "key" = $3 AND "status_code" IS NULL
                  AND "created_at" < now() - make_interval(secs => $5)))`,
      [...params, IDEMPOTENCY_KEY_TTL_HOURS, PENDING_TIMEOUT_SECONDS],
    );
    const inserted: unknown[] = await this.dataSource.query(
      `INSERT INTO "idempotency_keys" ("user_id", "route_id", "key", "request_hash")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("user_id", "route_id", "key") DO NOTHING
       RETURNING "id"`,
      [...params, hash],
    );
    if (inserted.length > 0) return null;
    const [row]: StoredRow[] = await this.dataSource.query(
      `SELECT "request_hash", "status_code", "response_body", "response_headers"
       FROM "idempotency_keys"
       WHERE "user_id" = $1 AND "route_id" = $2 AND "key" = $3`,
      params,
    );
    // Deleted between the insert and the read (the first request failed): let the client retry.
    if (!row || row.status_code === null) {
      throw new ConflictException({
        code: "conflict",
        message: "A request with this Idempotency-Key is still in progress. Try again shortly.",
      });
    }
    if (!sameHash(row.request_hash.trim(), hash)) {
      throw new UnprocessableEntityException({
        code: "idempotency_key_reused",
        message: "This Idempotency-Key was already used with a different request body.",
      });
    }
    return row;
  }

  /** Stores the success status, the body as the client receives it and the replayed headers. */
  private async complete(
    ids: { userId: string; routeId: string; key: string },
    status: number,
    body: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    try {
      const wire = body === undefined ? null : JSON.parse(JSON.stringify(body));
      await this.dataSource.query(
        `UPDATE "idempotency_keys"
         SET "status_code" = $4, "response_body" = $5, "response_headers" = $6
         WHERE "user_id" = $1 AND "route_id" = $2 AND "key" = $3`,
        [ids.userId, ids.routeId, ids.key, status, JSON.stringify(wire), JSON.stringify(headers)],
      );
    } catch (error) {
      // The create succeeded; failing to store the replay must not turn it into an error.
      this.logger.warn(
        `could not store the idempotent result for ${ids.routeId}: ${error instanceof Error ? error.name : "error"}`,
      );
      await this.release(ids);
    }
  }

  private async release(ids: { userId: string; routeId: string; key: string }): Promise<void> {
    try {
      await this.dataSource.query(
        `DELETE FROM "idempotency_keys"
         WHERE "user_id" = $1 AND "route_id" = $2 AND "key" = $3 AND "status_code" IS NULL`,
        [ids.userId, ids.routeId, ids.key],
      );
    } catch (error) {
      this.logger.warn(
        `could not release the idempotency key for ${ids.routeId}: ${error instanceof Error ? error.name : "error"}`,
      );
    }
  }
}

/** Constant-time comparison of two hex digests, so a stored hash is not leaked by response timing. */
export function sameHash(stored: string, computed: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(computed, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
