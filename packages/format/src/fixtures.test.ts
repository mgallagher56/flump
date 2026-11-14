import { describe, expect, it } from "vitest";
import { FORMAT_FIXTURES, runFormatCase } from "./fixtures.js";

// The cross-platform snapshot on V8 (Node). fixtures.bun.test.ts runs the same rows on Bun.
describe("formatter fixtures on V8", () => {
  it.each(FORMAT_FIXTURES.map((c) => [c.fn, JSON.stringify(c.args), c] as const))(
    "%s(%s)",
    (_fn, _args, c) => {
      expect(runFormatCase(c)).toBe(c.expected);
    },
  );
});
