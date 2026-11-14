import { describe, expect, it } from "vitest";
import { importReviewUrl, readWebOrigin, webOriginBootWarning } from "./review-url";

const ID = "00000000-0000-4000-8000-000000000001";

describe("import review links (E17 re-plan PR D)", () => {
  it("uses WEB_ORIGIN without a trailing slash", () => {
    expect(importReviewUrl(ID, { WEB_ORIGIN: "https://app.example.com/" })).toBe(
      `https://app.example.com/app/imports/${ID}`,
    );
  });

  it("falls back to the dev server outside production, and to a relative path in production", () => {
    expect(readWebOrigin({})).toBe("http://localhost:5173");
    expect(importReviewUrl(ID, { NODE_ENV: "production" })).toBe(`/app/imports/${ID}`);
    expect(webOriginBootWarning({ NODE_ENV: "production" })).toMatch(/WEB_ORIGIN/);
    expect(webOriginBootWarning({})).toBeNull();
  });

  it("ignores a value that is not a bare http(s) origin", () => {
    for (const bad of ["javascript:alert(1)", "https://a.com/path", "a.com", "https://a.com?x"]) {
      expect(readWebOrigin({ WEB_ORIGIN: bad, RAILWAY_ENVIRONMENT: "prod" })).toBeNull();
    }
  });
});
