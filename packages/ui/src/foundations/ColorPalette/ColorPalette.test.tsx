import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorPalette } from "./ColorPalette";

describe("ColorPalette Foundation", () => {
  it("renders header and canonical semantic tokens table", () => {
    render(<ColorPalette />);
    expect(screen.getByText("Flump colour system and semantic tokens")).toBeDefined();
    expect(screen.getByText("Indigo (Info)")).toBeDefined();
    expect(screen.getByText("Slate (kept for compatibility)")).toBeDefined();
    expect(screen.getByText("Mint (light neutrals and the mint fill)")).toBeDefined();
    expect(screen.getByText("Midnight (dark mode)")).toBeDefined();
    expect(screen.queryByText(/Sand/)).toBeNull();
  });

  it("shows the headline and Midnight and Mint keys in light and dark panels", () => {
    render(<ColorPalette />);
    expect(screen.getByText("Headline and Midnight and Mint keys, light and dark")).toBeDefined();
    for (const token of ["text.onHero", "text.heroFigure", "border.hero", "border.section"]) {
      expect(screen.getAllByText(token)).toHaveLength(2);
    }
    expect(screen.getAllByText("chart.series6")).toHaveLength(2);
    expect(screen.getAllByText("surface.scrim")).toHaveLength(2);
    for (const tint of ["teal", "apricot", "sage"]) {
      expect(screen.getAllByText(`surface.tint.${tint}`)).toHaveLength(2);
    }
  });
});
