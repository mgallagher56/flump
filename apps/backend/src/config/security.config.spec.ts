import { describe, expect, it, vi } from "vitest";
import {
  applySecurity,
  DEFAULT_JSON_LIMIT,
  parseTrustProxyHops,
  resolveTrustProxyHops,
  TAX_JSON_LIMIT,
} from "./security.config";

describe("parseTrustProxyHops", () => {
  it("is undefined when unset or blank", () => {
    expect(parseTrustProxyHops(undefined)).toBeUndefined();
    expect(parseTrustProxyHops("")).toBeUndefined();
  });
  it("parses non-negative integers", () => {
    expect(parseTrustProxyHops("1")).toBe(1);
    expect(parseTrustProxyHops("0")).toBe(0);
  });
  it("rejects invalid values", () => {
    for (const bad of ["abc", "-1", "1.5", "true"]) {
      expect(() => parseTrustProxyHops(bad)).toThrow(/TRUST_PROXY_HOPS/);
    }
  });
});

describe("resolveTrustProxyHops", () => {
  it("defaults to 1 on Railway or production, else undefined", () => {
    expect(resolveTrustProxyHops({ RAILWAY_ENVIRONMENT: "x" })).toBe(1);
    expect(resolveTrustProxyHops({ NODE_ENV: "production" })).toBe(1);
    expect(resolveTrustProxyHops({ NODE_ENV: "development" })).toBeUndefined();
  });
  it("prefers TRUST_PROXY_HOPS", () => {
    expect(resolveTrustProxyHops({ NODE_ENV: "production", TRUST_PROXY_HOPS: "3" })).toBe(3);
  });
});

describe("applySecurity", () => {
  function fakeApp() {
    const use = vi.fn();
    const set = vi.fn();
    const disable = vi.fn();
    const enableCors = vi.fn();
    return {
      use,
      enableCors,
      getHttpAdapter: () => ({ getInstance: () => ({ set, disable }) }),
      set,
      disable,
    };
  }

  it("sets cors without credentials, trust proxy, and registers middleware", () => {
    const app = fakeApp();
    applySecurity(app as never, {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://a.example",
      TRUST_PROXY_HOPS: "1",
    });
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: ["https://a.example"], credentials: false }),
    );
    // Scripts may read the paging cursor, the ETag and the replay flag (BE-09).
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({
        exposedHeaders: expect.arrayContaining(["X-Next-Cursor", "ETag", "Idempotent-Replayed"]),
      }),
    );
    expect(app.set).toHaveBeenCalledWith("trust proxy", 1);
    // v1 alias + helmet + tax json + default json
    expect(app.use).toHaveBeenCalledTimes(4);
  });

  it("does not set trust proxy when unset", () => {
    const app = fakeApp();
    applySecurity(app as never, {});
    expect(app.set).not.toHaveBeenCalledWith("trust proxy", expect.anything());
  });

  it("trusts one proxy hop by default in production", () => {
    const app = fakeApp();
    applySecurity(app as never, {
      NODE_ENV: "production",
      CORS_ALLOWED_ORIGINS: "https://a.example",
    });
    expect(app.set).toHaveBeenCalledWith("trust proxy", 1);
  });

  it("does not throw in production without CORS_ALLOWED_ORIGINS and allows no origins", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const app = fakeApp();
    expect(() => applySecurity(app as never, { NODE_ENV: "production" })).not.toThrow();
    expect(app.enableCors).toHaveBeenCalledWith(expect.objectContaining({ origin: [] }));
    err.mockRestore();
  });

  it("trusts one hop by default when RAILWAY_ENVIRONMENT is set", () => {
    const app = fakeApp();
    applySecurity(app as never, { RAILWAY_ENVIRONMENT: "production" });
    expect(app.set).toHaveBeenCalledWith("trust proxy", 1);
  });

  it("lets TRUST_PROXY_HOPS override the default, including 0", () => {
    const a = fakeApp();
    applySecurity(a as never, { RAILWAY_ENVIRONMENT: "production", TRUST_PROXY_HOPS: "2" });
    expect(a.set).toHaveBeenCalledWith("trust proxy", 2);
    const b = fakeApp();
    applySecurity(b as never, { NODE_ENV: "production", TRUST_PROXY_HOPS: "0" });
    expect(b.set).toHaveBeenCalledWith("trust proxy", 0);
  });

  it("exposes limits", () => {
    expect(DEFAULT_JSON_LIMIT).toBe("1mb");
    expect(TAX_JSON_LIMIT).toBe("8mb");
  });
});
