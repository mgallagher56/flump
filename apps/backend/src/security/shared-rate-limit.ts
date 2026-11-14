import { Logger, type Provider } from "@nestjs/common";
import { DataSource } from "typeorm";
import { PgRateLimitStore } from "./pg-rate-limit.store";
import { MemorySharedRateLimitStore, type SharedRateLimitStore } from "./rate-limit.store";

/**
 * Injection token for the shared rate-limit store (BE-07, M10). Exported by SecurityModule; the
 * same instance also satisfies `LimitStore` from `@flump/mcp`, for the MCP limiters.
 */
export const SHARED_RATE_LIMIT_STORE = Symbol("SHARED_RATE_LIMIT_STORE");

/**
 * Postgres when the app has a DataSource (always, in the running app). A module without TypeORM
 * (unit and HTTP test modules) gets the in-memory store behind the same interface.
 */
export const sharedRateLimitStoreProvider: Provider = {
  provide: SHARED_RATE_LIMIT_STORE,
  useFactory: (dataSource?: DataSource): SharedRateLimitStore => {
    if (dataSource) return new PgRateLimitStore(dataSource);
    if (process.env.NODE_ENV === "production") {
      new Logger("RateLimit").warn(
        "No DataSource: shared rate limits are in process memory and reset on deploy.",
      );
    }
    return new MemorySharedRateLimitStore();
  },
  inject: [{ token: DataSource, optional: true }],
};

/** Postgres "undefined_table": the schema has not been migrated (a DB_SYNCHRONIZE dev database). */
export function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    ((err as { code?: unknown }).code === "42P01" ||
      (err as { driverError?: { code?: unknown } }).driverError?.code === "42P01")
  );
}
