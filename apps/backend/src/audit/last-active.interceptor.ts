import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { Observable } from "rxjs";
import type { DataSource } from "typeorm";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Bound on the in-process cache; cleared when full (a few extra writes, never a leak). */
const MAX_CACHED_USERS = 10_000;
/** After a failed write, wait this long before trying that user again (no log flood when the
 * database is down). */
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

/**
 * Keeps `user_profiles.last_active_at` current (BE-06, ruling D4) so the retention job can find
 * accounts inactive for 24 months. At most one write per user per day per instance: the UPDATE
 * only touches a row last marked more than a day ago, and an in-process cache skips the query for
 * users already marked today. Fire and forget: it never delays or fails a request.
 */
@Injectable()
export class LastActiveInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LastActiveInterceptor.name);
  private readonly markedAt = new Map<string, number>();

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === "http") {
      const userId = context.switchToHttp().getRequest<{ user?: { id?: unknown } }>()?.user?.id;
      if (typeof userId === "string" && userId.length > 0) void this.touch(userId);
    }
    return next.handle();
  }

  /** Marks the user active; resolves to whether a query ran. Never throws. */
  async touch(userId: string, now: number = Date.now()): Promise<boolean> {
    const last = this.markedAt.get(userId);
    if (last !== undefined && now - last < DAY_MS) return false;
    if (this.markedAt.size >= MAX_CACHED_USERS) this.markedAt.clear();
    this.markedAt.set(userId, now);
    try {
      await this.dataSource.query(
        `UPDATE "user_profiles" SET "last_active_at" = now()
         WHERE "user_id" = $1 AND "last_active_at" < now() - interval '1 day'`,
        [userId],
      );
      return true;
    } catch (err) {
      this.markedAt.set(userId, now - DAY_MS + RETRY_AFTER_FAILURE_MS);
      this.logger.warn(`last_active_write_failed: ${err instanceof Error ? err.name : "error"}`);
      return false;
    }
  }
}
