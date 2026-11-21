// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isSafeRedirectUrl } from "./safeRedirectUrl";

describe("isSafeRedirectUrl with values that only turn into a URL as text", () => {
  it("rejects an array holding an https URL", () => {
    // new URL() would turn the array into the text of a valid https URL, so only the type check
    // stops it.
    expect(isSafeRedirectUrl(["https://auth.example.test/authorize"])).toBe(false);
  });
});
