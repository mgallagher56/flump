import { NestFactory } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AUTH_MODE, AuthModule } from "./auth.module";
import { DevBypassVerifier } from "./dev-bypass.verifier";
import { TOKEN_VERIFIER } from "./token-verifier";
import { WorkOsJwtVerifier } from "./workos-jwt.verifier";

const KEYS = [
  "NODE_ENV",
  "AUTH_DEV_BYPASS",
  "WORKOS_CLIENT_ID",
  "WORKOS_API_KEY",
  "WORKOS_ISSUER",
] as const;

describe("AuthModule", () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });
  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  const compile = () =>
    NestFactory.createApplicationContext(AuthModule, { logger: false, abortOnError: false });

  it("rejects boot when auth is not configured", async () => {
    await expect(compile()).rejects.toThrow(/not configured/);
  });

  it("rejects dev bypass outside development", async () => {
    process.env.AUTH_DEV_BYPASS = "true";
    process.env.NODE_ENV = "production";
    await expect(compile()).rejects.toThrow(/AUTH_DEV_BYPASS/);
  });

  it("provides the WorkOS verifier and mode when configured", async () => {
    process.env.WORKOS_CLIENT_ID = "client_test";
    const mod = await compile();
    expect(mod.get(TOKEN_VERIFIER)).toBeInstanceOf(WorkOsJwtVerifier);
    expect(mod.get(AUTH_MODE)).toBe("workos");
  });

  it("rejects boot in production with no client id and no issuer", async () => {
    process.env.NODE_ENV = "production";
    await expect(compile()).rejects.toThrow(/not configured/);
  });

  it("boots in production with only a client id (issuer derived)", async () => {
    process.env.NODE_ENV = "production";
    process.env.WORKOS_CLIENT_ID = "client_test";
    const mod = await compile();
    expect(mod.get(TOKEN_VERIFIER)).toBeInstanceOf(WorkOsJwtVerifier);
  });

  it("rejects boot when WORKOS_ISSUER is not an https URL", async () => {
    process.env.WORKOS_CLIENT_ID = "client_test";
    process.env.WORKOS_ISSUER = "http://auth.example.com";
    await expect(compile()).rejects.toThrow(/WORKOS_ISSUER/);
  });

  it("provides the dev verifier in development with the flag", async () => {
    process.env.AUTH_DEV_BYPASS = "true";
    process.env.NODE_ENV = "development";
    const mod = await compile();
    expect(mod.get(TOKEN_VERIFIER)).toBeInstanceOf(DevBypassVerifier);
    expect(mod.get(AUTH_MODE)).toBe("dev");
  });
});
