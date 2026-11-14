import { describe, expect, test } from "bun:test";
import { compareToBaseline, countNoticeInfoUses, countTokenViolations } from "./lib/design-tokens";
import { countReactIconsImports } from "./lib/react-icons";
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

describe("E16 token rules", () => {
  test("surface.tint.* is a semantic token, not a primitive", () => {
    expect(
      countTokenViolations(
        `css({ bg: "surface.tint.teal", b: "surface.tint.apricot", c: "surface.tint.sage" })`,
      ),
    ).toBe(0);
  });
  test("a literal .DEFAULT token path counts (Panda resolves it to nothing); the group name does not", () => {
    expect(
      countTokenViolations(`css({ borderColor: "border.DEFAULT", bg: "primary.DEFAULT" })`),
    ).toBe(2);
    expect(countTokenViolations(`css({ borderColor: "border", color: "primary" })`)).toBe(0);
  });
  test("status.info counts inside ProjectionNotice and ScenarioZone recipes only", () => {
    const src = `cva({ base: { borderColor: "status.info.border", color: "status.info.text" } })`;
    expect(
      countNoticeInfoUses(
        "packages/ui/src/patterns/ProjectionNotice/ProjectionNotice.styles.ts",
        src,
      ),
    ).toBe(2);
    expect(
      countNoticeInfoUses("packages/ui/src/patterns/ScenarioZone/ScenarioZone.styles.ts", src),
    ).toBe(2);
    expect(
      countNoticeInfoUses("packages/ui/src/primitives/InlineAlert/InlineAlert.styles.ts", src),
    ).toBe(0);
    expect(
      countNoticeInfoUses(
        "packages/ui/src/patterns/ProjectionNotice/ProjectionNotice.styles.ts",
        `// status.info is banned here\ncva({ base: { color: "text.secondary" } })`,
      ),
    ).toBe(0);
  });
});

describe("countTokenViolations scanner robustness", () => {
  test("does not treat anchors and ids as hex colours", () => {
    expect(
      countTokenViolations(`<a href="#faq">x</a> <a href="#add">y</a> <a href="#fab">z</a>`),
    ).toBe(0);
    expect(countTokenViolations(`<a href="#cafe00">x</a> <i id="#abcdef" />`)).toBe(0);
    expect(countTokenViolations(`<Link to="#add" />`)).toBe(0);
    expect(countTokenViolations(`const t = "#faq"`)).toBe(0);
  });
  test("still counts real colours", () => {
    expect(countTokenViolations(`const c = "#fff"`)).toBe(1);
    expect(countTokenViolations(`const c = "#ff0000"`)).toBe(1);
    expect(countTokenViolations(`const c = "#FF000080"`)).toBe(1);
  });
  test("ignores quotes in comments", () => {
    const src = `// don't do this\n/* it's "#ff0000" in a comment */\nconst x = "#ff0000";`;
    expect(countTokenViolations(src)).toBe(1);
  });
  test("apostrophes in JSX text do not hide later violations", () => {
    expect(countTokenViolations(`<p>Don't</p> const x = "#ff0000"`)).toBe(1);
    expect(
      countTokenViolations(`<p>Users' data</p>\nconst a = "#ff0000";\nconst b = 'rgb(0,0,0)';`),
    ).toBe(2);
  });
  test("single-quoted strings after operators and return still count", () => {
    expect(countTokenViolations(`const a = cond ? '#ff0000' : "slate.800"; return '#00ff00'`)).toBe(
      3,
    );
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
      "packages/tokens/src/index.ts",
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

describe("short hex inside CSS-like literals", () => {
  test("counts short hex after whitespace, parenthesis or comma", () => {
    expect(countTokenViolations('const a = "1px solid #fff";')).toBe(1);
    expect(countTokenViolations('const a = "linear-gradient(#fff, #000)";')).toBe(2);
  });
  test("ignores prose numbers and anchors", () => {
    expect(countTokenViolations('const a = "Issue #123";')).toBe(0);
    expect(countTokenViolations('const a = "see #faq";')).toBe(0);
  });
  test("a `to` object key can hold a real colour", () => {
    expect(countTokenViolations('const g = { from: "#ffffff", to: "#000000" };')).toBe(2);
  });
});

describe("countReactIconsImports", () => {
  test("counts named, aliased and multi-line imports per statement", () => {
    const src = `import { FaBolt, FaSnowflake } from "react-icons/fa";\nimport {\n  FiHome,\n} from 'react-icons/fi';\nimport type { IconType } from "react-icons";`;
    expect(countReactIconsImports(src)).toBe(3);
  });
  test("counts dynamic imports", () => {
    expect(countReactIconsImports(`const m = await import("react-icons/fa");`)).toBe(1);
  });
  test("ignores lucide, comments and prose", () => {
    const src = `import { Home } from "lucide-react";\n// import { FaBolt } from "react-icons/fa";\n/* from "react-icons/fi" */\nconst s = "use react-icons";`;
    expect(countReactIconsImports(src)).toBe(0);
  });
  test("ratchets via compareToBaseline: cannot grow, must shrink", () => {
    expect(compareToBaseline({ "a.tsx": 2 }, { "a.tsx": 1 }).failures).toHaveLength(1);
    expect(compareToBaseline({ "new.tsx": 1 }, {}).failures).toHaveLength(1);
    expect(compareToBaseline({ "a.tsx": 1 }, { "a.tsx": 2 }).stale).toHaveLength(1);
  });
});
