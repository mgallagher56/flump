import { createHmac } from "node:crypto";
import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LOG_REF_LABEL,
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
  it("treats a whitespace-only key as unset", () => {
    vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    expect(rateLimitStorageKey("x|1", { MCP_AUDIT_HMAC_KEY: "   " })).toBe(
      rateLimitStorageKey("x|1", {}),
    );
    expect(rateLimitStorageKey("x|1", { MCP_AUDIT_HMAC_KEY: "  \t", NODE_ENV: "production" })).toBe(
      rateLimitStorageKey("x|1", { NODE_ENV: "production" }),
    );
  });

  it("trims a configured key", () => {
    expect(rateLimitStorageKey("x|1", { MCP_AUDIT_HMAC_KEY: ` ${ROOT} ` })).toBe(
      rateLimitStorageKey("x|1", ENV),
    );
  });

  it("does not treat an empty RAILWAY variable as Railway (the E2E servers set one)", () => {
    expect(rateLimitStorageKey("x|1", { NODE_ENV: "development", RAILWAY_ENVIRONMENT: "" })).toBe(
      rateLimitStorageKey("x|1", {}),
    );
  });

  it("does not treat a whitespace-only or absent RAILWAY variable as Railway", () => {
    // A RAILWAY_* variable counts only when it has a value; blank after trimming is no value.
    const devRoot = rateLimitStorageKey("x|1", {});
    expect(rateLimitStorageKey("x|1", { RAILWAY_ENVIRONMENT: "  \t" })).toBe(devRoot);
    expect(rateLimitStorageKey("x|1", { RAILWAY_SERVICE_ID: undefined })).toBe(devRoot);
  });

  it("keeps stored bucket keys and log references the same across releases", () => {
    // Golden values, worked out with openssl outside this code base from the documented scheme:
    // derived = HMAC-SHA256(root, "flump:rate-limit-bucket:v1") (or "flump:log-user-ref:v1"), then
    // HMAC-SHA256(derived, input) in hex, cut to 32 (bucket) or 16 (log) characters, root "k" x 40.
    // A change to either label or to the scheme changes these and would silently reset every stored
    // bucket and break log correlation.
    expect(rateLimitStorageKey("x|1", ENV)).toBe("rl1:e902fefc353062a931d50c20d0f8147b");
    expect(logUserRef(USER, ENV)).toBe("ca8481e88d4d6a2a");
  });

  it("uses a configured key in production and on Railway", () => {
    const env = { ...ENV, NODE_ENV: "production", RAILWAY_ENVIRONMENT: "p" };
    expect(rateLimitStorageKey("x|1", env)).toBe(rateLimitStorageKey("x|1", ENV));
  });

  it("falls back to the public dev root for local development and test", () => {
    const devRoot = rateLimitStorageKey("x|1", {});
    for (const NODE_ENV of ["development", "test", undefined]) {
      expect(rateLimitStorageKey("x|1", { NODE_ENV })).toBe(devRoot);
    }
  });
});

describe("deployed environment with no key (process-local root)", () => {
  // A fresh module per test: the per-process root and its one log line are module state.
  async function freshModule() {
    vi.resetModules();
    const errors = vi.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const mod = await import("./keyed-ref.js");
    return { mod, errors };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const deployedEnvs: Record<string, string | undefined>[] = [
    { NODE_ENV: "production" },
    { RAILWAY_ENVIRONMENT: "production" },
    { NODE_ENV: "development", RAILWAY_SERVICE_ID: "svc" },
  ];

  it("never throws, yields rl1 plus 32 hex, and is stable within the process", async () => {
    const { mod } = await freshModule();
    for (const env of deployedEnvs) {
      const key = mod.rateLimitStorageKey("x|1", env);
      expect(key).toMatch(/^rl1:[0-9a-f]{32}$/);
      expect(mod.rateLimitStorageKey("x|1", env)).toBe(key);
      expect(mod.logUserRef(USER, env)).toMatch(/^[0-9a-f]{16}$/);
    }
    const [first, ...rest] = deployedEnvs.map((env) => mod.rateLimitStorageKey("x|1", env));
    for (const key of rest) expect(key).toBe(first);
  });

  it("differs from the public dev root and from a configured key", async () => {
    const { mod } = await freshModule();
    const deployed = mod.rateLimitStorageKey("x|1", { NODE_ENV: "production" });
    expect(deployed).not.toBe(mod.rateLimitStorageKey("x|1", {}));
    expect(deployed).not.toBe(mod.rateLimitStorageKey("x|1", ENV));
  });

  it("uses a new random root in a new process", async () => {
    const first = (await freshModule()).mod.rateLimitStorageKey("x|1", { NODE_ENV: "production" });
    const second = (await freshModule()).mod.rateLimitStorageKey("x|1", { NODE_ENV: "production" });
    expect(second).not.toBe(first);
  });

  it("logs one error line naming the variable, with no values, the first time only", async () => {
    const { mod, errors } = await freshModule();
    for (const env of deployedEnvs) {
      mod.rateLimitStorageKey(`user:${USER}:credential|60000`, env);
      mod.logUserRef(USER, env);
    }
    expect(errors).toHaveBeenCalledTimes(1);
    const message = String(errors.mock.calls[0]?.[0]);
    expect(message).toContain("MCP_AUDIT_HMAC_KEY");
    expect(message).not.toContain(USER);
    expect(message).not.toMatch(/[0-9a-f]{32}/);
  });

  it("logs nothing when the key is set or outside a deployed environment", async () => {
    const { mod, errors } = await freshModule();
    mod.rateLimitStorageKey("x|1", { ...ENV, NODE_ENV: "production" });
    mod.rateLimitStorageKey("x|1", { NODE_ENV: "development", RAILWAY_ENVIRONMENT: "" });
    expect(errors).not.toHaveBeenCalled();
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
    const derived = createHmac("sha256", ROOT).update(LOG_REF_LABEL).digest();
    expect(logUserRef(USER, ENV)).toBe(
      createHmac("sha256", derived).update(USER).digest("hex").slice(0, 16),
    );
    expect(rateLimitStorageKey(USER, ENV)).not.toContain(logUserRef(USER, ENV));
  });
});
