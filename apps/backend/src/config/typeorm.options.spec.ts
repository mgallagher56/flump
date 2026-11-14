import { describe, expect, it } from "vitest";
import { BankConnection } from "../entities/bank-connection.entity";
import { ENTITIES, typeOrmOptionsFromEnv } from "./typeorm.options";

const KEY = "k".repeat(32);

describe("typeOrmOptionsFromEnv", () => {
  it("is migration-driven in production", () => {
    const o = typeOrmOptionsFromEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://u:p@db.example.com/x",
      BANKING_TOKEN_ENCRYPTION_KEY: KEY,
    }) as Record<string, unknown>;
    expect(o.type).toBe("postgres");
    expect(o.synchronize).toBe(false);
    expect(o.migrationsRun).toBe(true);
    expect(o.entities).toBe(ENTITIES);
    expect(ENTITIES).toHaveLength(13);
    expect(ENTITIES).toContain(BankConnection);
  });

  it("points the migrations glob at ../migrations", () => {
    const o = typeOrmOptionsFromEnv({ NODE_ENV: "development" }) as { migrations: string[] };
    expect(o.migrations).toHaveLength(1);
    expect(o.migrations[0].replaceAll("\\", "/")).toMatch(
      /\/src\/migrations\/\*\[0-9\]\{\.ts,\.js\}$/,
    );
  });

  it("splits DATABASE_URL into discrete fields and never passes the url or query", () => {
    const o = typeOrmOptionsFromEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://u%40x:p%2Fw@db.example.com:6543/mydb?sslmode=disable",
    }) as Record<string, unknown>;
    expect(o.host).toBe("db.example.com");
    expect(o.port).toBe(6543);
    expect(o.username).toBe("u@x");
    expect(o.password).toBe("p/w");
    expect(o.database).toBe("mydb");
    expect(o.ssl).toMatchObject({ rejectUnauthorized: true });
    expect("url" in o).toBe(false);
  });

  it("defaults the URL port to 5432", () => {
    const o = typeOrmOptionsFromEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://u:p@db.example.com/x",
    }) as Record<string, unknown>;
    expect(o.port).toBe(5432);
  });

  it("passes discrete DB_* fields through", () => {
    const o = typeOrmOptionsFromEnv({ NODE_ENV: "development" }) as Record<string, unknown>;
    expect(o.host).toBe("localhost");
    expect(o.ssl).toBe(false);
    expect(o.synchronize).toBe(false);
  });

  it("runs each migration in its own transaction so one can opt out", () => {
    const o = typeOrmOptionsFromEnv({ NODE_ENV: "development" }) as Record<string, unknown>;
    expect(o.migrationsTransactionMode).toBe("each");
  });

  it("hands the pool limits and a UTC session to pg", () => {
    const o = typeOrmOptionsFromEnv({
      NODE_ENV: "development",
      DB_POOL_MAX: "7",
      DB_LOCK_TIMEOUT_MS: "2000",
    }) as { extra: Record<string, unknown> };
    expect(o.extra).toEqual({
      max: 7,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 10_000,
      lock_timeout: 2_000,
      idle_in_transaction_session_timeout: 30_000,
      options: "-c TimeZone=UTC",
    });
  });
});
