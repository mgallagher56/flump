import { describe, expect, test } from "bun:test";
import {
  countDurationLiterals,
  countFontSizeLiterals,
  countHeavyWeights,
  countInlineStyles,
  countStyleLiterals,
  isStyleScanExempt,
  stripComments,
} from "./lib/style-literals";

describe("countFontSizeLiterals", () => {
  test("allows fontSizes scale keys, including responsive objects", () => {
    expect(countFontSizeLiterals(`css({ fontSize: "xs" })`)).toBe(0);
    expect(countFontSizeLiterals(`css({ fontSize: { base: "2xl", md: "4xl" } })`)).toBe(0);
    expect(countFontSizeLiterals(`css({ fontSize: "inherit" })`)).toBe(0);
  });
  test("counts raw px, rem and clamp() values", () => {
    expect(countFontSizeLiterals(`css({ fontSize: "13px" })`)).toBe(1);
    expect(countFontSizeLiterals(`css({ fontSize: "1.0625rem", color: "text.muted" })`)).toBe(1);
    expect(countFontSizeLiterals(`css({ fontSize: "clamp(2rem, 1rem + 2vw, 3rem)" })`)).toBe(1);
    expect(countFontSizeLiterals(`css({ fontSize: { base: "20px", md: "28px" } })`)).toBe(2);
  });
  test("counts each raw branch of a ternary and bare numbers", () => {
    expect(countFontSizeLiterals(`css({ fontSize: mobile ? "16px" : "sm" })`)).toBe(1);
    expect(countFontSizeLiterals(`const s = { fontSize: 12 }`)).toBe(1);
  });
  test("a JSX attribute value stops at its own string or braces", () => {
    expect(countFontSizeLiterals(`<text fontSize={11} fill="red" x="4">`)).toBe(1);
    expect(countFontSizeLiterals(`<text fontSize="12" fill="#fff">`)).toBe(1);
  });
  test("ignores types, identifiers and comparisons", () => {
    expect(countFontSizeLiterals(`type P = { fontSize: string; size2: number }`)).toBe(0);
    expect(countFontSizeLiterals(`css({ fontSize: sizeMap[size] })`)).toBe(0);
    expect(countFontSizeLiterals(`if (fontSize === "13px") {}`)).toBe(0);
  });
});

describe("countHeavyWeights", () => {
  test("counts weights above 700 as strings, numbers and Panda names", () => {
    expect(countHeavyWeights(`css({ fontWeight: "800" })`)).toBe(1);
    expect(countHeavyWeights(`css({ fontWeight: 900 })`)).toBe(1);
    expect(countHeavyWeights(`css({ fontWeight: "extrabold" })`)).toBe(1);
  });
  test("allows 700 and below", () => {
    expect(countHeavyWeights(`css({ fontWeight: "bold" })`)).toBe(0);
    expect(countHeavyWeights(`css({ fontWeight: "700" })`)).toBe(0);
    expect(countHeavyWeights(`css({ fontWeight: 600 })`)).toBe(0);
  });
});

describe("countDurationLiterals", () => {
  test("counts every literal duration in transition and animation values", () => {
    expect(countDurationLiterals(`css({ transition: "all 0.2s ease" })`)).toBe(1);
    expect(
      countDurationLiterals(`css({ transition: "background-color 0.15s ease, color 150ms" })`),
    ).toBe(2);
    expect(countDurationLiterals(`css({ animation: "spin 1s linear infinite" })`)).toBe(1);
    expect(countDurationLiterals(`css({ animationDuration: "0.8s" })`)).toBe(1);
    expect(countDurationLiterals(`<motion.div transition={{ duration: 0.3 }} />`)).toBe(1);
  });
  test("allows duration tokens and none", () => {
    expect(countDurationLiterals(`css({ transitionDuration: "fast" })`)).toBe(0);
    expect(
      countDurationLiterals(
        `css({ transition: "transform token(durations.base) token(easings.standard)" })`,
      ),
    ).toBe(0);
    expect(countDurationLiterals(`css({ transition: "none" })`)).toBe(0);
  });
});

describe("countInlineStyles and file scope", () => {
  test("counts style= props", () => {
    expect(countInlineStyles(`<div style={{ width: 4 }} /><span style={s} />`)).toBe(2);
    expect(countInlineStyles(`<div data-style={x} />`)).toBe(0);
  });
  test("inline style= only counts in apps/web and apps/marketing", () => {
    const src = `<div style={{ width: w }} />`;
    expect(countStyleLiterals("apps/web/app/x.tsx", src).inlineStyle).toBe(1);
    expect(countStyleLiterals("apps/marketing/src/x.tsx", src).inlineStyle).toBe(1);
    expect(countStyleLiterals("packages/ui/src/x.tsx", src).inlineStyle).toBe(0);
  });
  test("comments never count", () => {
    expect(
      countStyleLiterals("apps/web/app/x.tsx", `// fontSize: "13px", transition: "all 0.2s"`),
    ).toEqual({ fontSize: 0, fontWeight: 0, duration: 0, inlineStyle: 0 });
  });
  test("token definition files are exempt", () => {
    expect(isStyleScanExempt("packages/ui/src/tokens/typography.ts")).toBe(true);
    expect(isStyleScanExempt("packages/ui/src/primitives/Card/Card.styles.ts")).toBe(false);
  });
});

describe("review follow-ups", () => {
  test("comment stripping keeps // and /* inside strings and templates", () => {
    expect(stripComments(`const u = 'a//b'; css({ fontSize: "13px" })`)).toContain(`"13px"`);
    expect(
      countStyleLiterals(
        "packages/ui/src/x.ts",
        `const a = '/*'; css({ fontSize: "13px" }); const b = '*/';`,
      ).fontSize,
    ).toBe(1);
    expect(stripComments("const h = `${scheme}//${host}`; // note")).toBe(
      "const h = `${scheme}//${host}`; \n",
    );
  });
  test("spring physics numbers in a transition are not durations", () => {
    expect(
      countDurationLiterals(
        `<m.div transition={{ type: "spring", stiffness: 300, damping: 20 }} />`,
      ),
    ).toBe(0);
    expect(countDurationLiterals(`css({ transitionDuration: 200 })`)).toBe(1);
    expect(countDurationLiterals(`<m.div transition={{ duration: 0.3, delay: 0.1 }} />`)).toBe(2);
  });
});
