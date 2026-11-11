import { join } from "node:path";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { Account } from "../entities/account.entity";
import { AccountDetail } from "../entities/account-detail.entity";
import { BankConnection } from "../entities/bank-connection.entity";
import { BudgetEntry } from "../entities/budget-entry.entity";
import { McpToken } from "../entities/mcp-token.entity";
import { TaxRecord } from "../entities/tax-record.entity";
import { Transaction } from "../entities/transaction.entity";
import { UserProfile } from "../entities/user-profile.entity";
import { type Env, resolveDbConfig } from "./db.config";

// biome-ignore lint/complexity/noBannedTypes: TypeORM entity classes are typed as Function[]
export const ENTITIES: Function[] = [
  Account,
  Transaction,
  AccountDetail,
  BankConnection,
  UserProfile,
  BudgetEntry,
  TaxRecord,
  McpToken,
];

// Relative to this file so it resolves under both `bun src/...` (ts) and dist/ (js).
// Migration files end in a timestamp (Name1794355200000), so `*[0-9]` skips specs,
// .d.ts and source maps that sit in the same folder.
const MIGRATIONS_GLOB = join(__dirname, "..", "migrations", "*[0-9]{.ts,.js}");

/**
 * The single source of TypeORM options (used by the Nest app and the CLI data source).
 *
 * DATABASE_URL is split into discrete fields rather than handed to the driver:
 * a `?sslmode=...` in the URL could otherwise override the resolver's `ssl`
 * decision inside pg. Query parameters on the URL are therefore ignored.
 */
export function typeOrmOptionsFromEnv(env: Env): TypeOrmModuleOptions {
  const db = resolveDbConfig(env);

  let connection: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  if ("url" in db.connection) {
    const url = new URL(db.connection.url);
    connection = {
      host: url.hostname,
      port: url.port ? Number(url.port) : 5432,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    };
  } else {
    connection = db.connection;
  }

  return {
    type: "postgres",
    ...connection,
    ssl: db.ssl,
    entities: ENTITIES,
    migrations: [MIGRATIONS_GLOB],
    synchronize: db.synchronize,
    migrationsRun: db.migrationsRun,
  };
}
