import { describe, expect, test } from "bun:test";
import { compareToBaseline, countTokenViolations } from "./lib/design-tokens";
import { shouldSkip } from "./lib/scan";
import { needsTabular } from "./lib/tabular-nums";

describe("countTokenViolations", () => {
  test("counts quoted hex colours", () => {
    expect(
      countTokenViolations(`const a = "#fff"; const b = '#141A26'; c("1px solid #12345678")`),
    ).toBe(3);
  });
  test("counts rgb/rgba/hsl/hsla in strings", () => {
    expect(countTokenViolations(`x("rgba(0,0,0,.5)"); y("hsl(1 2% 3%)")`)).toBe(2);
  });
  test("counts primitive scale tokens", () => {
    expect(
      countTokenViolations(`css({ color: "indigo.600", bg: 'slate.800', c: "success.500" })`),
    ).toBe(3);
  });
  test("ignores semantic tokens and non-colour text", () => {
    const src = `css({ color: "status.danger.text", bg: "surface.card", c: "chart.series1", p: "primary.solid", b: "border.subtle", t: "text.muted" }); // issue #123`;
    expect(countTokenViolations(src)).toBe(0);
  });
});

describe("compareToBaseline", () => {
  test("passes when at baseline", () => {
    expect(compareToBaseline({ "a.ts": 2 }, { "a.ts": 2 })).toEqual({ failures: [], stale: [] });
  });
  test("fails when a file exceeds baseline", () => {
    expect(compareToBaseline({ "a.ts": 3 }, { "a.ts": 2 }).failures).toHaveLength(1);
  });
  test("fails on a new file with any violation", () => {
    expect(compareToBaseline({ "new.ts": 1 }, {}).failures).toHaveLength(1);
  });
  test("reports stale when below baseline or gone", () => {
    const r = compareToBaseline({ "a.ts": 1 }, { "a.ts": 2, "gone.ts": 1 });
    expect(r.failures).toEqual([]);
    expect(r.stale).toHaveLength(2);
  });
});

describe("shouldSkip", () => {
  test("skips tests, stories, d.ts, token definitions and non-ts", () => {
    for (const f of [
      "a/Foo.test.tsx",
      "a/Foo.stories.tsx",
      "a/x.d.ts",
      "packages/ui/src/tokens/index.ts",
      "a/x.css",
    ])
      expect(shouldSkip(f)).toBe(true);
    expect(shouldSkip("a/Foo.tsx")).toBe(false);
  });
});

describe("needsTabular", () => {
  test("flags number formatting without tabular-nums", () => {
    expect(needsTabular(`const f = useFormatCurrency(); <b>{f(1)}</b>`)).toBe(true);
  });
  test("passes with tabular-nums or fontVariantNumeric", () => {
    expect(
      needsTabular(`Intl.NumberFormat("en-GB"); css({ fontVariantNumeric: "tabular-nums" })`),
    ).toBe(false);
  });
  test("flags toLocaleString and toFixed", () => {
    expect(needsTabular(`n.toLocaleString("en-GB")`)).toBe(true);
    expect(needsTabular(`n.toFixed(2)`)).toBe(true);
  });
  test("ignores files that format nothing", () => {
    expect(needsTabular(`export const x = 1`)).toBe(false);
  });
});
