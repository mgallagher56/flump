import { describe, expect, it } from "vitest";
import { isSafeRedirectUrl } from "./safeRedirectUrl";

describe("isSafeRedirectUrl", () => {
  it("accepts an https URL", () => {
    expect(isSafeRedirectUrl("https://auth.example.test/authorize?x=1")).toBe(true);
  });

  it.each([
    "http://auth.example.test/authorize",
    "javascript:alert(1)",
    "data:text/html,<b>x</b>",
    "//auth.example.test/authorize",
    "/relative/path",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isSafeRedirectUrl(url)).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isSafeRedirectUrl(undefined)).toBe(false);
    expect(isSafeRedirectUrl(42)).toBe(false);
  });
});
