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

  it("does not set outline-offset globally and supports the data-focus-managed opt-out", () => {
    const block = css.slice(css.lastIndexOf(":where("));
    expect(block).toContain("[data-focus-managed]");
    expect(block.slice(block.indexOf("{", block.indexOf(":focus-visible")))).not.toMatch(
      /outline-offset:/,
    );
  });
});
