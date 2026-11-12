// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyRobotsHeader, isIndexingAllowed } from "./indexing.server";

describe("isIndexingAllowed", () => {
  it("is false by default", () => {
    expect(isIndexingAllowed({})).toBe(false);
  });
  it("is true only for exactly 'true'", () => {
    expect(isIndexingAllowed({ ALLOW_INDEXING: "true" })).toBe(true);
    expect(isIndexingAllowed({ ALLOW_INDEXING: "1" })).toBe(false);
    expect(isIndexingAllowed({ ALLOW_INDEXING: "TRUE" })).toBe(false);
    expect(isIndexingAllowed({ ALLOW_INDEXING: "" })).toBe(false);
  });
});

describe("applyRobotsHeader", () => {
  it("sets noindex by default and returns the headers", () => {
    const headers = new Headers();
    expect(applyRobotsHeader(headers, {})).toBe(headers);
    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
  it("omits the header when ALLOW_INDEXING=true", () => {
    const headers = new Headers();
    applyRobotsHeader(headers, { ALLOW_INDEXING: "true" });
    expect(headers.has("X-Robots-Tag")).toBe(false);
  });
  it.each(["1", "TRUE", "yes"])("keeps noindex for ALLOW_INDEXING=%s", (value) => {
    const headers = new Headers();
    applyRobotsHeader(headers, { ALLOW_INDEXING: value });
    expect(headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
