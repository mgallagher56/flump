import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  LOG_USER_REF_LABEL,
  logUserRef,
  RATE_LIMIT_BUCKET_LABEL,
  rateLimitStorageKey,
} from "./keyed-ref";

// Built at runtime: the repository is public, so no key-shaped literals.
const ROOT = "k".repeat(40);
const ENV = { MCP_AUDIT_HMAC_KEY: ROOT };
const USER = `user_${"A".repeat(26)}`;

describe("rateLimitStorageKey (BE-15, N4)", () => {
  it("holds neither the user id nor the IP, only 128 bits of hex", () => {
    const userKey = rateLimitStorageKey(`user:${USER}:credential|60000`, ENV);
    const ipKey = rateLimitStorageKey("mcp:fail:203.0.113.7|60000", ENV);
    for (const key of [userKey, ipKey]) {
      expect(key).toMatch(/^rl1:[0-9a-f]{32}$/);
      expect(key).not.toContain(USER);
      expect(key).not.toContain("203.0.113.7");
    }
  });

  it("is stable for the same input and differs between users", () => {
    const a = rateLimitStorageKey(`user:${USER}:read|60000`, ENV);
    expect(rateLimitStorageKey(`user:${USER}:read|60000`, ENV)).toBe(a);
    expect(rateLimitStorageKey(`user:${USER}X:read|60000`, ENV)).not.toBe(a);
  });

  it("uses a key derived from the root under a fixed label, never the root itself", () => {
    const derived = createHmac("sha256", ROOT).update(RATE_LIMIT_BUCKET_LABEL).digest();
    const expected = createHmac("sha256", derived).update("x|1").digest("hex").slice(0, 32);
    expect(rateLimitStorageKey("x|1", ENV)).toBe(`rl1:${expected}`);
    const underRoot = createHmac("sha256", ROOT).update("x|1").digest("hex").slice(0, 32);
    expect(rateLimitStorageKey("x|1", ENV)).not.toBe(`rl1:${underRoot}`);
  });

  it("changes with the root secret, and falls back to the public dev root when unset", () => {
    const configured = rateLimitStorageKey("x|1", ENV);
    expect(rateLimitStorageKey("x|1", { MCP_AUDIT_HMAC_KEY: "j".repeat(40) })).not.toBe(configured);
    const unset = rateLimitStorageKey("x|1", {});
    expect(unset).toMatch(/^rl1:[0-9a-f]{32}$/);
    expect(unset).not.toBe(configured);
    expect(rateLimitStorageKey("x|1", {})).toBe(unset);
  });
});

describe("root secret handling", () => {
  const unsetMessage = /MCP_AUDIT_HMAC_KEY/;

  it("treats a whitespace-only key as unset", () => {
    expect(rateLimitStorageKey("x|1", { MCP_AUDIT_HMAC_KEY: "   " })).toBe(
      rateLimitStorageKey("x|1", {}),
    );
    expect(() =>
      rateLimitStorageKey("x|1", { MCP_AUDIT_HMAC_KEY: "  \t", NODE_ENV: "production" }),
    ).toThrow(unsetMessage);
  });

  it("trims a configured key", () => {
    expect(rateLimitStorageKey("x|1", { MCP_AUDIT_HMAC_KEY: ` ${ROOT} ` })).toBe(
      rateLimitStorageKey("x|1", ENV),
    );
  });

  it("throws, naming the variable but no value, in production with no key", () => {
    expect(() => rateLimitStorageKey("x|1", { NODE_ENV: "production" })).toThrow(unsetMessage);
    expect(() => logUserRef(USER, { NODE_ENV: "production" })).toThrow(unsetMessage);
  });

  it("throws on Railway with no key, whatever NODE_ENV says", () => {
    expect(() => rateLimitStorageKey("x|1", { RAILWAY_ENVIRONMENT: "production" })).toThrow(
      unsetMessage,
    );
    expect(() =>
      rateLimitStorageKey("x|1", { NODE_ENV: "development", RAILWAY_SERVICE_ID: "svc" }),
    ).toThrow(unsetMessage);
  });

  it("still uses a configured key in production and on Railway", () => {
    expect(() =>
      rateLimitStorageKey("x|1", { ...ENV, NODE_ENV: "production", RAILWAY_ENVIRONMENT: "p" }),
    ).not.toThrow();
  });

  it("falls back to the public dev root for local development and test", () => {
    for (const NODE_ENV of ["development", "test", undefined]) {
      expect(rateLimitStorageKey("x|1", { NODE_ENV })).toMatch(/^rl1:[0-9a-f]{32}$/);
    }
  });
});

describe("logUserRef (BE-15, S6)", () => {
  it("is a short stable reference that never contains the user id", () => {
    const ref = logUserRef(USER, ENV);
    expect(ref).toMatch(/^[0-9a-f]{16}$/);
    expect(ref).not.toContain(USER);
    expect(logUserRef(USER, ENV)).toBe(ref);
    expect(logUserRef(`${USER}X`, ENV)).not.toBe(ref);
  });

  it("is domain-separated from the bucket keys", () => {
    const derived = createHmac("sha256", ROOT).update(LOG_USER_REF_LABEL).digest();
    expect(logUserRef(USER, ENV)).toBe(
      createHmac("sha256", derived).update(USER).digest("hex").slice(0, 16),
    );
    expect(rateLimitStorageKey(USER, ENV)).not.toContain(logUserRef(USER, ENV));
  });
});
