import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppConfigModule, BOOT_CONFIG } from "./config.module";

const KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "DB_PASSWORD",
  "DB_SSL",
  "BANKING_TOKEN_ENCRYPTION_KEY",
] as const;

describe("AppConfigModule", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const compile = () =>
    NestFactory.createApplicationContext(AppConfigModule, { logger: false, abortOnError: false });

  it("rejects boot in a strict env missing the banking key, naming it", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgres://u:p@db.example.com/x";
    await expect(compile()).rejects.toThrow(/BANKING_TOKEN_ENCRYPTION_KEY/);
  });

  it("resolves for a valid strict env", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgres://u:p@db.example.com/x";
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = "k".repeat(32);
    const mod = await compile();
    expect(mod.get(BOOT_CONFIG).db.migrationsRun).toBe(true);
  });

  it("logs the no-verify warning once", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    process.env.NODE_ENV = "development";
    process.env.DB_SSL = "no-verify";
    await compile();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/DB_SSL=no-verify/);
  });
});
