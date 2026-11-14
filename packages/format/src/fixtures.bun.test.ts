// The cross-platform snapshot on JavaScriptCore (Bun). Run by `bun test ./src/fixtures.bun.test.ts`
// from this package's test scripts; Vitest excludes it (it imports bun:test).
import { describe, expect, test } from "bun:test";
import { FORMAT_FIXTURES, runFormatCase } from "./fixtures.js";

describe("formatter fixtures on JavaScriptCore", () => {
  for (const c of FORMAT_FIXTURES) {
    test(`${c.fn}(${JSON.stringify(c.args)})`, () => {
      expect(runFormatCase(c)).toBe(c.expected);
    });
  }
});
