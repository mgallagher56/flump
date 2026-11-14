import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { fontSizes } from "../../tokens";
import { TypographyScale } from "./TypographyScale";

describe("TypographyScale Foundation", () => {
  it("renders type scale and font family specimens", () => {
    render(<TypographyScale />);
    expect(screen.getByText("Flump Typography Scale & Tabular Numbers")).toBeDefined();
    expect(screen.getByText("Tabular Numbers Alignment Test")).toBeDefined();
  });

  it("renders every fontSizes key with a statically extractable class (4xl to 6xl included)", () => {
    // The story once built `css({ fontSize: key })` dynamically, which Panda cannot extract, so
    // 4xl, 5xl and 6xl rendered at body size. Each key must have a literal in the source and the
    // matching `fs_<key>` class on its specimen.
    const source = readFileSync(path.join(__dirname, "TypographyScale.tsx"), "utf8");
    render(<TypographyScale />);
    for (const key of Object.keys(fontSizes)) {
      expect(source, key).toContain(`css({ fontSize: "${key}" })`);
      const row = screen.getByTestId(`font-size-${key}`);
      expect(row.innerHTML, key).toContain(`fs_${key}`);
      expect(row.textContent, key).toContain(fontSizes[key as keyof typeof fontSizes].value);
    }
  });

  it("renders every text style specimen", () => {
    render(<TypographyScale />);
    expect(screen.getByText("Text Styles")).toBeDefined();
    for (const name of [
      "display",
      "heading.xl",
      "body.md",
      "label.sm",
      "numeric.hero",
      "numeric.kpi",
      "numeric.sm",
      "numeric.unset",
    ]) {
      expect(screen.getByText(name)).toBeDefined();
    }
  });
});
