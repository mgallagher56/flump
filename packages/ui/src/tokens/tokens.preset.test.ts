/**
 * How `@repo/ui` wires the shared tokens (`@flump/tokens`) into Panda, ships fonts and draws card
 * edges. The token values themselves are tested in packages/tokens.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import flumpPreset from "../../panda.preset";
import {
  densityRadii,
  densitySizes,
  densitySpacing,
  fontSizes,
  motionKeyframes,
  pageSpacing,
  semanticTokens,
  textStyles,
} from "./index";

const extend = (flumpPreset as any).theme.extend;

describe("E15 preset wiring", () => {
  it("passes the shared token objects through unchanged", () => {
    expect(extend.tokens.fontSizes).toBe(fontSizes);
    expect(extend.semanticTokens.radii).toBe(densityRadii.radii);
    expect(semanticTokens.radii).toBe(densityRadii.radii);
    expect(extend.tokens.spacing.page).toBe(pageSpacing.page);
  });

  it("registers the new token groups, textStyles and keyframes", () => {
    for (const group of [
      "lineHeights",
      "fontWeights",
      "letterSpacings",
      "durations",
      "easings",
      "zIndex",
      "sizes",
    ]) {
      expect(extend.tokens, group).toHaveProperty(group);
    }
    expect(extend.textStyles).toBe(textStyles);
    expect(extend.keyframes).toBe(motionKeyframes);
    expect(extend.semanticTokens.sizes).toBe(densitySizes);
    expect(extend.semanticTokens.spacing).toBe(densitySpacing);
  });

  it("declares the compact density condition", () => {
    expect((flumpPreset as any).conditions.extend.compact).toBe("[data-density=compact] &");
  });

  // Generated output is gitignored; skipped when `bun run generate` has not run.
  const generatedTokens = new URL("../../styled-system/tokens/index.js", import.meta.url);
  it.skipIf(!existsSync(generatedTokens))("panda codegen emits primary.solid", () => {
    expect(readFileSync(generatedTokens, "utf8")).toContain('"colors.primary.solid"');
  });
});

describe("E15 self-hosted fonts", () => {
  const root = path.resolve(__dirname, "../..");
  it("fonts.css imports the two variable fonts and is exported from the package", () => {
    const css = readFileSync(path.join(root, "src/fonts/fonts.css"), "utf8");
    for (const pkg of ["inter", "plus-jakarta-sans"]) {
      expect(css).toContain(`@fontsource-variable/${pkg}/wght.css`);
    }
    const pkgJson = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    expect(pkgJson.exports["./fonts.css"]).toBe("./src/fonts/fonts.css");
    for (const dep of ["inter", "plus-jakarta-sans"]) {
      expect(pkgJson.dependencies[`@fontsource-variable/${dep}`]).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe("E16 light card separation", () => {
  it("Card, KpiCard, Table and CollapsibleDrawer draw their outer edge in border (border.DEFAULT)", () => {
    const read = (rel: string) => readFileSync(path.resolve(__dirname, "..", rel), "utf8");
    for (const rel of [
      "primitives/Card/Card.styles.ts",
      "primitives/KpiCard/KpiCard.styles.ts",
      "primitives/Table/Table.styles.ts",
      "primitives/CollapsibleDrawer/CollapsibleDrawer.styles.ts",
    ]) {
      // The first borderColor in each recipe is the outer container edge.
      const first = /borderColor:\s*"([^"]+)"/.exec(read(rel))?.[1];
      expect(first, rel).toBe("border");
    }
  });
});
