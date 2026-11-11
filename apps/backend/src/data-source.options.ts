import type { DataSourceOptions } from "typeorm";
import type { Env } from "./config/db.config";
import { typeOrmOptionsFromEnv } from "./config/typeorm.options";

/**
 * Options for the TypeORM CLI data source. Same as the app's, except migrations are
 * never auto-run on initialize: CLI commands (revert, generate) must not apply pending
 * migrations as a side effect, which strict mode would otherwise do.
 */
export function cliDataSourceOptions(env: Env): DataSourceOptions {
  return { ...(typeOrmOptionsFromEnv(env) as DataSourceOptions), migrationsRun: false };
}
