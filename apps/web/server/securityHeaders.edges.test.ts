// @vitest-environment node
import { describe, expect, it } from "vitest";
import { wantsNonDocumentCsp } from "./securityHeaders";

describe("wantsNonDocumentCsp content type matching", () => {
  it("ignores case and spaces in the media type", () => {
    expect(wantsNonDocumentCsp("Application/JSON; charset=utf-8")).toBe(true);
    expect(wantsNonDocumentCsp(" text/plain ")).toBe(true);
  });
});
