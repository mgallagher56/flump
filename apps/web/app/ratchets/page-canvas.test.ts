import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P0: the light-mode page canvas must be the light `surface.canvas`, never a legacy or undefined
 * variable that falls back to the UA colour (dark charcoal under an OS dark preference).
 */
const APP_DIR = path.resolve(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(APP_DIR, file), "utf8");

describe("page canvas", () => {
  it("the root body uses the surface.canvas variable", () => {
    const root = read("root.tsx");
    expect(root).toContain('backgroundColor: "var(--colors-surface-canvas)"');
    expect(root).not.toContain("--colors-background");
  });

  it("html paints the canvas and pins color-scheme to the active theme", () => {
    const css = read("index.css");
    expect(css).toMatch(/html\s*\{[^}]*background-color:\s*var\(--colors-surface-canvas\)/);
    expect(css).toMatch(/html\s*\{[^}]*color-scheme:\s*light/);
    expect(css).toMatch(/html\[data-theme="dark"\]\s*\{[^}]*color-scheme:\s*dark/);
  });
});
