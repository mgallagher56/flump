import { describe, expect, test } from "bun:test";
import { compareBaselines } from "./lib/baseline-vs-main";

describe("compareBaselines (a ratchet baseline may only shrink)", () => {
  test("a higher allowance and a new file are raises", () => {
    expect(compareBaselines({ "a.md": 2 }, { "a.md": 3, "b.md": 1 })).toEqual([
      "a.md: 2 on main, 3 here",
      "b.md: 0 on main, 1 here",
    ]);
  });

  test("an equal or lower allowance and a removed file pass", () => {
    expect(compareBaselines({ "a.md": 2, "b.md": 4 }, { "a.md": 2, "b.md": 1 })).toEqual([]);
  });
});
