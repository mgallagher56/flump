import { describe, expect, it } from "vitest";
import { DEV_CORS_ORIGINS, resolveCorsOrigins } from "./cors.config";

describe("resolveCorsOrigins", () => {
  it("falls back to localhost dev defaults outside production", () => {
    expect(resolveCorsOrigins({ NODE_ENV: "development" })).toEqual(DEV_CORS_ORIGINS);
    expect(resolveCorsOrigins({})).toEqual(DEV_CORS_ORIGINS);
  });

  it("throws in production when CORS_ALLOWED_ORIGINS is missing or empty", () => {
    expect(() => resolveCorsOrigins({ NODE_ENV: "production" })).toThrow(/CORS_ALLOWED_ORIGINS/);
    expect(() =>
      resolveCorsOrigins({ NODE_ENV: "production", CORS_ALLOWED_ORIGINS: " , ," }),
    ).toThrow(/CORS_ALLOWED_ORIGINS/);
  });

  it("splits on commas, trims and drops empties", () => {
    expect(
      resolveCorsOrigins({
        NODE_ENV: "production",
        CORS_ALLOWED_ORIGINS: " https://app.flump.co.uk , ,http://localhost:5173,",
      }),
    ).toEqual(["https://app.flump.co.uk", "http://localhost:5173"]);
  });

  it("rejects values that are not bare http(s) origins", () => {
    for (const bad of [
      "*",
      "app.flump.co.uk",
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
