import { describe, expect, it, vi } from "vitest";
import { DEV_CORS_ORIGINS, resolveCorsOrigins } from "./cors.config";

describe("resolveCorsOrigins", () => {
  it("falls back to localhost dev defaults outside production", () => {
    expect(resolveCorsOrigins({ NODE_ENV: "development" })).toEqual(DEV_CORS_ORIGINS);
    expect(resolveCorsOrigins({})).toEqual(DEV_CORS_ORIGINS);
  });

  it("allows no cross-origin origins, with a loud error, in production when unset or empty", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(resolveCorsOrigins({ NODE_ENV: "production" })).toEqual([]);
    expect(resolveCorsOrigins({ NODE_ENV: "production", CORS_ALLOWED_ORIGINS: " , ," })).toEqual(
      [],
    );
    expect(err).toHaveBeenCalledTimes(2);
    expect(String(err.mock.calls[0]?.[0])).toContain("CORS_ALLOWED_ORIGINS");
    err.mockRestore();
  });

  it("still rejects malformed entries in production", () => {
    expect(() =>
      resolveCorsOrigins({ NODE_ENV: "production", CORS_ALLOWED_ORIGINS: "not-an-origin" }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("splits on commas, trims and drops empties", () => {
    expect(
      resolveCorsOrigins({
        NODE_ENV: "production",
        CORS_ALLOWED_ORIGINS: " https://app.example.test , ,http://localhost:5173,",
      }),
    ).toEqual(["https://app.example.test", "http://localhost:5173"]);
  });

  it("rejects values that are not bare http(s) origins", () => {
    for (const bad of [
      "*",
      "app.example.test",
      "ftp://x.com",
      "https://x.com/path",
      "https://x.com/",
    ]) {
      expect(() => resolveCorsOrigins({ CORS_ALLOWED_ORIGINS: bad })).toThrow(
        /CORS_ALLOWED_ORIGINS/,
      );
    }
  });

  it("uses explicit origins outside production too", () => {
    expect(resolveCorsOrigins({ CORS_ALLOWED_ORIGINS: "https://a.example" })).toEqual([
      "https://a.example",
    ]);
  });
});
