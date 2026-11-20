import { randomBytes } from "node:crypto";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppConfigModule, BOOT_CONFIG } from "./config.module";

// E3 D-11 (coordinator ruling, 20 November 2026): at boot, a banking key that is not 32 generated
// random bytes logs one warning and boots; a generated key boots silently; a short key is still
// refused. Sample keys are built at runtime.
const KEYS = [
  "NODE_ENV",
  "DATABASE_URL",
  "DB_HOST",
  "DB_SSL",
  "BANKING_TOKEN_ENCRYPTION_KEY",
  "BANKING_TOKEN_ENCRYPTION_KEYS",
] as const;

describe("AppConfigModule banking key format warning", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgres://u:p@db.example.com/x";
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
  const keyWarnings = (warn: ReturnType<typeof vi.spyOn>) =>
    warn.mock.calls.map(([m]) => String(m)).filter((m) => m.includes("BANKING_TOKEN_ENCRYPTION"));

  it("a 32-character passphrase boots and warns once, naming the variable only", async () => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    const secret = ["plain", "words", "passphrase"].join("-").padEnd(32, "x");
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = secret;
    const mod = await compile();
    expect(mod.get(BOOT_CONFIG)).toBeDefined();
    const lines = keyWarnings(warn);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/BANKING_TOKEN_ENCRYPTION_KEY key version 1/);
    expect(lines[0]).not.toContain(secret);
  });

  it.each([
    ["64 hex characters", () => randomBytes(32).toString("hex")],
    ["base64 of 32 bytes", () => randomBytes(32).toString("base64")],
  ])("a key of %s boots silently", async (_label, make) => {
    const warn = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = make();
    await compile();
    expect(keyWarnings(warn)).toEqual([]);
  });

  it("a short key is still refused at boot", async () => {
    process.env.BANKING_TOKEN_ENCRYPTION_KEY = "k".repeat(31);
    await expect(compile()).rejects.toThrow(
      /BANKING_TOKEN_ENCRYPTION_KEY must be set to at least 32/,
    );
  });
});
