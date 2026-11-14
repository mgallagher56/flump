import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "index.css"), "utf-8");

/** Returns the CSS with every top-level `@layer name { ... }` block (and its body) removed. */
const stripLayerBlocks = (source: string): string => {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const m = /@layer\s+[\w\s,-]*\{/.exec(source.slice(i));
    if (!m) {
      out += source.slice(i);
      break;
    }
    out += source.slice(i, i + m.index);
    let depth = 1;
    let j = i + m.index + m[0].length;
    while (j < source.length && depth > 0) {
      if (source[j] === "{") depth++;
      else if (source[j] === "}") depth--;
      j++;
    }
    i = j;
  }
  return out;
};

const unlayered = stripLayerBlocks(css);

describe("apps/web index.css", () => {
  it("global focus-visible rule exists, is unlayered and uses the focusRing token", () => {
    expect(unlayered).toMatch(/:focus-visible\s*\{[^}]*outline-style:\s*solid/);
    expect(unlayered).toMatch(/:focus-visible\s*\{[^}]*var\(--colors-border-focus-ring\)/);
    expect(css.lastIndexOf(":focus-visible")).toBeGreaterThan(css.indexOf("@layer base"));
  });

  it("global focus rule does not set outline-offset (component offsets survive) and honours opt-out", () => {
    const rule = /\[tabindex\]:not\(\[tabindex="-1"\]\)[\s\S]*?:focus-visible\s*\{([^}]*)\}/.exec(
      unlayered,
    );
    expect(rule).not.toBeNull();
    expect(rule?.[1]).not.toMatch(/outline-offset/);
    expect(unlayered).toContain("[data-focus-managed]");
  });

  it("checkbox focus ring uses the focusRing token, not the 1.60:1 rgba shadow", () => {
    expect(css).not.toContain("rgba(99, 99, 241, 0.35)");
    expect(css).toMatch(
      /\[data-flp-checkbox\]\):focus-visible\s*\{[^}]*--colors-border-focus-ring/,
    );
  });

  it("checked checkbox fill uses primary-solid with the foreground tick", () => {
    expect(css).toMatch(/:checked\s*\{[^}]*background-color:\s*var\(--colors-primary-solid[^}]*\}/);
    expect(css).not.toMatch(/border-left:\s*2px solid #ffffff/);
  });

  it("checked checkbox border stays primary, not primary-solid", () => {
    const checked = css.match(/:checked\s*\{[^}]*\}/)?.[0] ?? "";
    expect(checked).toMatch(/border-color:\s*var\(--colors-primary,/);
    expect(checked).not.toMatch(/border-color:\s*var\(--colors-primary-solid/);
  });

  it("scroll-padding-top and scroll-padding-bottom are declared outside @layer", () => {
    expect(unlayered).toContain("scroll-padding-top");
    expect(unlayered).toContain("scroll-padding-bottom");
    expect(unlayered).toMatch(
      /max-width:\s*1023\.98px\)\s*\{\s*html\s*\{[^}]*scroll-padding-bottom/,
    );
  });

  it("reduced motion keeps spinners animating with a pulse, not iteration-count 1", () => {
    expect(unlayered).toContain("[data-spinner]");
    expect(unlayered).toMatch(/@keyframes flp-spinner-pulse/);
    expect(unlayered).toMatch(/\[data-spinner\][\s\S]*?animation-iteration-count:\s*infinite/);
  });
});
