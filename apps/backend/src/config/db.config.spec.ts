import { describe, expect, it } from "vitest";
import { isStrictEnv, resolveDbConfig, resolvePoolConfig } from "./db.config";

const remoteUrl = "postgres://u:p@db.example.com/x";

function messageOf(env: Record<string, string | undefined>): string {
  try {
    resolveDbConfig(env);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected resolveDbConfig to throw");
}

describe("isStrictEnv", () => {
  it("is false only for development and test", () => {
    expect(isStrictEnv({ NODE_ENV: "development" })).toBe(false);
    expect(isStrictEnv({ NODE_ENV: "test" })).toBe(false);
    expect(isStrictEnv({ NODE_ENV: "production" })).toBe(true);
    expect(isStrictEnv({ NODE_ENV: "staging" })).toBe(true);
    expect(isStrictEnv({})).toBe(true);
  });
});

describe("resolveDbConfig", () => {
  describe("strict environment", () => {
    it("throws naming DATABASE_URL with no value when nothing is configured", () => {
      const message = messageOf({});
      expect(message).toContain("DATABASE_URL");
      expect(message).not.toContain("postgres");
    });

    it("requires DB_PASSWORD in the discrete form", () => {
      const base = {
        NODE_ENV: "production",
        DB_HOST: "db.example.com",
        DB_USER: "u",
        DB_NAME: "n",
      };
      expect(messageOf(base)).toContain("DB_PASSWORD");
      expect(messageOf({ ...base, DB_PASSWORD: "postgres" })).toContain("DB_PASSWORD");
      expect(messageOf({ ...base, DB_PASSWORD: "" })).toContain("DB_PASSWORD");
    });

    it("accepts the discrete form with a real password and verifies TLS", () => {
      const config = resolveDbConfig({
        NODE_ENV: "production",
        DB_HOST: "db.example.com",
        DB_USER: "u",
        DB_NAME: "n",
        DB_PASSWORD: "s3cret-pw",
      });
      expect(config.connection).toEqual({
        host: "db.example.com",
        port: 5432,
        username: "u",
        password: "s3cret-pw",
        database: "n",
      });
      expect(config.ssl).toEqual({ rejectUnauthorized: true });
    });

    it("returns verifying TLS and runs migrations for a remote URL", () => {
      const config = resolveDbConfig({ NODE_ENV: "production", DATABASE_URL: remoteUrl });
      expect(config.connection).toEqual({ url: remoteUrl });
      expect(config.ssl).toEqual({ rejectUnauthorized: true });
      expect(config.migrationsRun).toBe(true);
      expect(config.synchronize).toBe(false);
    });

    it("rejects DB_SYNCHRONIZE=true", () => {
      expect(
        messageOf({ NODE_ENV: "production", DATABASE_URL: remoteUrl, DB_SYNCHRONIZE: "true" }),
      ).toContain("DB_SYNCHRONIZE");
    });
  });

  describe("development", () => {
    it("returns the local defaults", () => {
      const config = resolveDbConfig({ NODE_ENV: "development" });
      expect(config).toEqual({
        connection: {
          host: "localhost",
          port: 5432,
          username: "postgres",
          password: "postgres",
          database: "postgres",
        },
        ssl: false,
        synchronize: false,
        migrationsRun: false,
        pool: {
          max: 10,
          connectionTimeoutMillis: 5_000,
          idleTimeoutMillis: 30_000,
          statementTimeoutMillis: 10_000,
          lockTimeoutMillis: 5_000,
          idleInTransactionTimeoutMillis: 30_000,
        },
        warnings: [],
      });
    });

    it("enables synchronize only on DB_SYNCHRONIZE=true", () => {
      expect(resolveDbConfig({ NODE_ENV: "development", DB_SYNCHRONIZE: "true" }).synchronize).toBe(
        true,
      );
      expect(
        resolveDbConfig({ NODE_ENV: "development", DB_SYNCHRONIZE: "false" }).synchronize,
      ).toBe(false);
    });
  });

  describe("TLS", () => {
    const prod = { NODE_ENV: "production" };

    it("passes DB_SSL_CA through", () => {
      const config = resolveDbConfig({
        ...prod,
        DATABASE_URL: remoteUrl,
        DB_SSL_CA: "-----CA-----",
      });
      expect(config.ssl).toEqual({ rejectUnauthorized: true, ca: "-----CA-----" });
    });

    it("no-verify disables verification with one warning naming DB_SSL", () => {
      const config = resolveDbConfig({ ...prod, DATABASE_URL: remoteUrl, DB_SSL: "no-verify" });
      expect(config.ssl).toEqual({ rejectUnauthorized: false });
      expect(config.warnings).toHaveLength(1);
      expect(config.warnings[0]).toContain("DB_SSL");
    });

    it("DB_SSL=false disables TLS", () => {
      expect(resolveDbConfig({ ...prod, DATABASE_URL: remoteUrl, DB_SSL: "false" }).ssl).toBe(
        false,
      );
    });

    it("DB_SSL=false on a remote host keeps TLS off but warns once without leaking the URL", () => {
      const config = resolveDbConfig({
        ...prod,
        DATABASE_URL: "postgres://user:s3cret@db.example.com/x",
        DB_SSL: "false",
      });
      expect(config.ssl).toBe(false);
      expect(config.warnings).toHaveLength(1);
      expect(config.warnings[0]).toContain("DB_SSL");
      expect(config.warnings[0]).not.toMatch(/s3cret|db\.example\.com|postgres:\/\//);
    });

    it("DB_SSL=false on a local host does not warn", () => {
      const config = resolveDbConfig({
        NODE_ENV: "development",
        DB_HOST: "localhost",
        DB_SSL: "false",
      });
      expect(config.ssl).toBe(false);
      expect(config.warnings).toEqual([]);
    });

    it("rejects an unknown DB_SSL value without echoing it", () => {
      const message = messageOf({ ...prod, DATABASE_URL: remoteUrl, DB_SSL: "bogus" });
      expect(message).toContain("DB_SSL");
      expect(message).not.toContain("bogus");
    });

    it("treats a localhost URL as local", () => {
      expect(resolveDbConfig({ ...prod, DATABASE_URL: "postgres://u:p@localhost/x" }).ssl).toBe(
        false,
      );
    });

    it("does not treat localhost-db.internal as local", () => {
      expect(
        resolveDbConfig({ ...prod, DATABASE_URL: "postgres://u:p@localhost-db.internal/x" }).ssl,
      ).toEqual({ rejectUnauthorized: true });
    });

    it("treats 127.0.0.1 and [::1] as local", () => {
      expect(resolveDbConfig({ ...prod, DATABASE_URL: "postgres://u:p@127.0.0.1/x" }).ssl).toBe(
        false,
      );
      expect(resolveDbConfig({ ...prod, DATABASE_URL: "postgres://u:p@[::1]:5432/x" }).ssl).toBe(
        false,
      );
    });

    it("treats a discrete local host as local", () => {
      expect(resolveDbConfig({ NODE_ENV: "development", DB_HOST: "127.0.0.1" }).ssl).toBe(false);
    });
  });

  describe("DATABASE_URL parsing", () => {
    it("throws a generic error naming the variable for a malformed URL", () => {
      const message = messageOf({ NODE_ENV: "production", DATABASE_URL: "not a url" });
      expect(message).toContain("DATABASE_URL");
      expect(message).not.toContain("not a url");
    });

    it("accepts a URL with sslmode", () => {
      const url = "postgres://u:p@db.example.com/x?sslmode=require";
      expect(resolveDbConfig({ NODE_ENV: "production", DATABASE_URL: url }).connection).toEqual({
        url,
      });
    });
  });

  it("never includes supplied secrets in thrown messages", () => {
    const secrets = ["hunter2-secret", "tok-abc123", "s3cr3t-value"];
    const envs = secrets.flatMap((secret) => [
      { NODE_ENV: "production", DATABASE_URL: `not a url ${secret}` },
      { NODE_ENV: "production", DATABASE_URL: remoteUrl, DB_SSL: secret },
      {
        NODE_ENV: "production",
        DATABASE_URL: `postgres://u:${secret}@db.example.com/x`,
        DB_SYNCHRONIZE: "true",
      },
      { NODE_ENV: "production", DB_HOST: "h", DB_USER: "u", DB_NAME: "n", DB_PASSWORD: "" },
      { NODE_ENV: "development", DB_PORT: secret },
    ]);
    for (const [index, env] of envs.entries()) {
      const message = messageOf(env);
      for (const secret of secrets) {
        expect(message, `case ${index}`).not.toContain(secret);
      }
    }
  });
});

describe("resolvePoolConfig", () => {
  const poolError = (env: Record<string, string>): string => {
    try {
      resolvePoolConfig(env);
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error("expected resolvePoolConfig to throw");
  };

  it("uses the conservative defaults when unset or empty", () => {
    expect(resolvePoolConfig({})).toEqual(
      resolvePoolConfig({ DB_POOL_MAX: "", DB_LOCK_TIMEOUT_MS: " " }),
    );
    expect(resolvePoolConfig({}).max).toBe(10);
  });

  it("reads every setting from its variable", () => {
    expect(
      resolvePoolConfig({
        DB_POOL_MAX: "20",
        DB_POOL_CONNECTION_TIMEOUT_MS: "2000",
        DB_POOL_IDLE_TIMEOUT_MS: "60000",
        DB_STATEMENT_TIMEOUT_MS: "15000",
        DB_LOCK_TIMEOUT_MS: "3000",
        DB_IDLE_IN_TRANSACTION_TIMEOUT_MS: "45000",
      }),
    ).toEqual({
      max: 20,
      connectionTimeoutMillis: 2_000,
      idleTimeoutMillis: 60_000,
      statementTimeoutMillis: 15_000,
      lockTimeoutMillis: 3_000,
      idleInTransactionTimeoutMillis: 45_000,
    });
  });

  it.each([
    ["DB_POOL_MAX", "0"],
    ["DB_POOL_MAX", "101"],
    ["DB_POOL_MAX", "ten"],
    ["DB_POOL_MAX", "2.5"],
    ["DB_POOL_MAX", "-1"],
    ["DB_STATEMENT_TIMEOUT_MS", "0"],
    ["DB_LOCK_TIMEOUT_MS", "1e3"],
    ["DB_POOL_CONNECTION_TIMEOUT_MS", "99"],
    ["DB_IDLE_IN_TRANSACTION_TIMEOUT_MS", "600001"],
  ])("rejects %s=%s, naming the variable but not the value", (name, value) => {
    const message = poolError({ [name]: value });
    expect(message).toContain(name);
    expect(message).not.toContain(`=${value}`);
  });

  it("requires the lock timeout to be below the statement timeout", () => {
    expect(poolError({ DB_LOCK_TIMEOUT_MS: "10000" })).toContain("DB_LOCK_TIMEOUT_MS");
    expect(resolvePoolConfig({ DB_LOCK_TIMEOUT_MS: "9999" }).lockTimeoutMillis).toBe(9_999);
  });

  it("is part of resolveDbConfig", () => {
    expect(resolveDbConfig({ NODE_ENV: "development", DB_POOL_MAX: "4" }).pool.max).toBe(4);
    expect(() => resolveDbConfig({ NODE_ENV: "development", DB_POOL_MAX: "x" })).toThrow(
      /DB_POOL_MAX/,
    );
  });
});
