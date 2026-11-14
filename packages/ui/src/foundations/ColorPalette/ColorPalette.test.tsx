import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorPalette } from "./ColorPalette";

describe("ColorPalette Foundation", () => {
  it("renders header and canonical semantic tokens table", () => {
    render(<ColorPalette />);
    expect(screen.getByText("Flump Color System & Semantic Tokens")).toBeDefined();
    expect(screen.getByText("Indigo (Info)")).toBeDefined();
    expect(screen.getByText("Slate (Surfaces & Text)")).toBeDefined();
    expect(screen.getByText("Sand (Warm Neutrals)")).toBeDefined();
  });

  it("shows the E15 keys in light and dark panels", () => {
    render(<ColorPalette />);
    expect(screen.getByText("New in E15 (Light & Dark)")).toBeDefined();
    expect(screen.getAllByText("chart.series6")).toHaveLength(2);
    expect(screen.getAllByText("surface.scrim")).toHaveLength(2);
    for (const tint of ["teal", "apricot", "sage"]) {
      expect(screen.getAllByText(`surface.tint.${tint}`)).toHaveLength(2);
    }
  });
});
