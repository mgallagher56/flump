// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "index.css"), "utf-8");

describe("apps/marketing index.css", () => {
  it("has an unlayered global focus-visible rule using the focusRing token", () => {
    const idx = css.lastIndexOf(":focus-visible");
    expect(idx).toBeGreaterThan(-1);
    // After the closing brace of the final @layer block, so Panda's layered utilities lose.
    const afterLayers = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(afterLayers).toContain(":focus-visible");
    expect(css.slice(idx)).toMatch(/var\(--colors-border-focus-ring\)/);
  });

  it("gives the focus ring the band's own text colour on the mint and dark bands", () => {
    expect(css).toMatch(
      /\[data-tone-band="hero"\]\s*\{\s*--colors-border-focus-ring: var\(--colors-text-on-hero\);/,
    );
    expect(css).toMatch(
      /\[data-tone-band="contrast"\],\s*footer\s*\{\s*--colors-border-focus-ring: var\(--colors-text-on-contrast\);/,
    );
  });

  it("does not set outline-offset globally and supports the data-focus-managed opt-out", () => {
    const block = css.slice(css.lastIndexOf(":where("));
    expect(block).toContain("[data-focus-managed]");
    expect(block.slice(block.indexOf("{", block.indexOf(":focus-visible")))).not.toMatch(
      /outline-offset:/,
    );
  });

  it("maps fills and the text on them to system colour pairs in forced colours", () => {
    const block = css.match(/@media \(forced-colors: active\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(block).toMatch(/--colors-primary-solid:\s*ButtonFace/);
    expect(block).toMatch(/--colors-primary-foreground:\s*ButtonText/);
    expect(block).toMatch(/--colors-surface-contrast:\s*Canvas;/);
    expect(block).toMatch(/--colors-text-on-contrast:\s*CanvasText/);
    expect(block).toMatch(/--colors-surface-hero:\s*Canvas;/);
    expect(block).toMatch(/--colors-text-on-hero:\s*CanvasText/);
    expect(block).toMatch(/--colors-text-hero-figure:\s*CanvasText/);
  });
});
