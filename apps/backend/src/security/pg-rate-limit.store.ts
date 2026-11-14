import { Logger } from "@nestjs/common";
import type { DataSource, QueryRunner } from "typeorm";
import type { RateLimitDecision, RateLimitWindow, SharedRateLimitStore } from "./rate-limit.store";

/** Every this many hits (per process), expired rows are swept in the background. */
export const SWEEP_EVERY = 200;
/** Rows deleted per sweep, so one sweep never holds locks for long. */
export const SWEEP_BATCH = 1000;

type Queryable = Pick<DataSource, "query"> | Pick<QueryRunner, "query">;

/**
 * One window, one statement. The INSERT counts the hit when the bucket is new or its window has
 * passed (rollover: count back to 1, a fresh window from now) or the count is under the limit.
 * When the window is full the ON CONFLICT ... WHERE leaves the row as it was and `up` is empty,
 * so a refused hit spends nothing. The outer SELECT reads the statement's snapshot, which is the
 * row before this INSERT: exactly the expiry a refused caller must wait for.
 *
 * $1 bucket id, $2 now (null for the database clock), $3 window ms, $4 limit.
 */
const HIT_SQL = `
WITH t AS (SELECT COALESCE($2::timestamptz, now()) AS now),
up AS (
  INSERT INTO rate_limit_buckets AS b (key, window_start, count, expires_at)
  SELECT $1, t.now, 1, t.now + $3::double precision * interval '1 millisecond' FROM t
  ON CONFLICT (key) DO UPDATE SET
    window_start = CASE WHEN b.expires_at <= EXCLUDED.window_start
      THEN EXCLUDED.window_start ELSE b.window_start END,
    count = CASE WHEN b.expires_at <= EXCLUDED.window_start THEN 1 ELSE b.count + 1 END,
    expires_at = CASE WHEN b.expires_at <= EXCLUDED.window_start
      THEN EXCLUDED.expires_at ELSE b.expires_at END
  WHERE b.expires_at <= EXCLUDED.window_start OR b.count < $4
  RETURNING count
)
SELECT (SELECT count FROM up) AS count,
       GREATEST(1, CEIL(EXTRACT(EPOCH FROM (old.expires_at - t.now))))::int AS retry
FROM t LEFT JOIN rate_limit_buckets old ON old.key = $1`;

const PEEK_SQL = `
WITH t AS (SELECT COALESCE($2::timestamptz, now()) AS now)
SELECT b.count, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (b.expires_at - t.now))))::int AS retry
FROM t JOIN rate_limit_buckets b ON b.key = $1 AND b.expires_at > t.now`;

const SWEEP_SQL = `
DELETE FROM rate_limit_buckets WHERE key IN (
  SELECT key FROM rate_limit_buckets WHERE expires_at < now() LIMIT ${SWEEP_BATCH}
)`;

const bucketId = (key: string, w: RateLimitWindow) => `${key}|${w.windowMs}`;
const at = (now: number | undefined) => (now === undefined ? null : new Date(now));

/**
 * Shared fixed-window counters in Postgres (BE-07, M10, decision D6: no Redis). Table
 * `rate_limit_buckets` (migration AddRateLimitBuckets1794632012000), one row per key and window
 * length, so limits are correct across replicas and survive a restart. Time comes from the
 * database clock, so replicas with skewed clocks still share one window.
 *
 * A single-window hit is one atomic statement. A multi-window hit (the credential policy: 15
 * minutes and a day) runs one statement per window in a transaction, in a fixed order, and rolls
 * back when any window refuses, so a refused hit spends no quota in the others.
 *
 * Rows are disposable: an expired row is reset by the next hit, and every SWEEP_EVERY hits a
 * bounded background delete removes old ones. Keys hold a user id or an MCP client address and
 * live no longer than their window (at most a day) plus the next sweep.
 *
 * Errors propagate; the caller decides fail-open or fail-closed per bucket.
 */
export class PgRateLimitStore implements SharedRateLimitStore {
  private readonly logger = new Logger("RateLimit");
  private hits = 0;

  constructor(private readonly dataSource: DataSource) {}

  async hit(
    key: string,
    windows: readonly RateLimitWindow[],
    now?: number,
  ): Promise<RateLimitDecision> {
    if (++this.hits % SWEEP_EVERY === 0) void this.sweep();
    const ordered = [...windows].sort((a, b) => a.windowMs - b.windowMs);
    if (ordered.length === 0) return { allowed: true, retryAfterSeconds: 0 };
    if (ordered.length === 1) {
      const [only] = ordered as [RateLimitWindow];
      return summarise([[only, await hitOne(this.dataSource, key, only, now)]]);
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.startTransaction();
      const results: [RateLimitWindow, HitRow][] = [];
      for (const w of ordered) results.push([w, await hitOne(runner, key, w, now)]);
      const decision = summarise(results);
      if (decision.allowed) await runner.commitTransaction();
      else await runner.rollbackTransaction();
      return decision;
    } catch (err) {
      if (runner.isTransactionActive) await runner.rollbackTransaction().catch(() => undefined);
      throw err;
    } finally {
      await runner.release();
    }
  }

  async peek(key: string, window: RateLimitWindow, now?: number): Promise<RateLimitDecision> {
    const rows: { count: number; retry: number }[] = await this.dataSource.query(PEEK_SQL, [
      bucketId(key, window),
      at(now),
    ]);
    const row = rows[0];
    if (!row || row.count < window.limit) return { allowed: true, retryAfterSeconds: 0 };
    return { allowed: false, retryAfterSeconds: row.retry, exceeded: window, remaining: 0 };
  }

  async reset(key: string, window: RateLimitWindow): Promise<void> {
    await this.dataSource.query("DELETE FROM rate_limit_buckets WHERE key = $1", [
      bucketId(key, window),
    ]);
  }

  /** Deletes up to SWEEP_BATCH expired rows. Never throws: a failed sweep waits for the next. */
  async sweep(): Promise<void> {
    try {
      await this.dataSource.query(SWEEP_SQL);
    } catch (err) {
      this.logger.warn(`rate_limit_sweep_failed: ${err instanceof Error ? err.name : "error"}`);
    }
  }
}

interface HitRow {
  count: number | null;
  retry: number | null;
}

async function hitOne(
  db: Queryable,
  key: string,
  w: RateLimitWindow,
  now: number | undefined,
): Promise<HitRow> {
  const rows: HitRow[] = await db.query(HIT_SQL, [bucketId(key, w), at(now), w.windowMs, w.limit]);
  return rows[0] ?? { count: null, retry: null };
}

function summarise(results: readonly [RateLimitWindow, HitRow][]): RateLimitDecision {
  let blocked: { window: RateLimitWindow; retry: number } | undefined;
  let remaining = Number.POSITIVE_INFINITY;
  for (const [w, row] of results) {
    if (row.count === null) {
      const retry = Math.max(1, row.retry ?? 1);
      if (!blocked || retry > blocked.retry) blocked = { window: w, retry };
    } else {
      remaining = Math.min(remaining, w.limit - row.count);
    }
  }
  if (blocked) {
    return {
      allowed: false,
      retryAfterSeconds: blocked.retry,
      exceeded: blocked.window,
      remaining: 0,
    };
  }
  return {
    allowed: true,
    retryAfterSeconds: 0,
    ...(Number.isFinite(remaining) ? { remaining } : {}),
  };
}
