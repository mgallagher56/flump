import { Logger } from "@nestjs/common";
import type { Logger as TypeOrmLogger } from "typeorm";
import { resolveSlowQueryMs } from "../config/db.config";

/** Longest slice of SQL printed; enough to recognise the query, short of a bulk insert. */
export const MAX_SLOW_QUERY_LENGTH = 500;

/**
 * TypeORM logger for slow queries (M15). Everything else matches TypeORM's own default under
 * `logging: false`: migration messages are printed, queries, errors and schema builds are not. The line has the duration and the SQL text with its
 * placeholders; parameters are never printed. It goes through Nest's Logger, so the scrubbing
 * logger redacts it and adds the request id when a request is being served.
 */
export class SlowQueryLogger implements TypeOrmLogger {
  private readonly logger = new Logger("SlowQuery");

  // TypeORM passes the parameters third; they are deliberately ignored.
  logQuerySlow(time: number, query: string, _parameters?: unknown): void {
    const sql = query.replace(/\s+/g, " ").trim();
    this.logger.warn({
      event: "slow_query",
      durationMs: time,
      query: sql.length > MAX_SLOW_QUERY_LENGTH ? `${sql.slice(0, MAX_SLOW_QUERY_LENGTH)}...` : sql,
    });
  }

  logQuery(): void {}
  logQueryError(): void {}
  logSchemaBuild(): void {}
  logMigration(message: string): void {
    this.logger.log(message);
  }
  log(): void {}
}

/** The TypeORM options that turn the slow-query log on (merged into the app's options). */
export function slowQueryOptions(env: Record<string, string | undefined>): {
  maxQueryExecutionTime: number;
  logger: TypeOrmLogger;
} {
  return { maxQueryExecutionTime: resolveSlowQueryMs(env), logger: new SlowQueryLogger() };
}
