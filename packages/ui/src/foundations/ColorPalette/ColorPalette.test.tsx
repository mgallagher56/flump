import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorPalette } from "./ColorPalette";

describe("ColorPalette Foundation", () => {
  it("renders header and canonical semantic tokens table", () => {
    render(<ColorPalette />);
    expect(screen.getByText("Flump Color System & Semantic Tokens")).toBeDefined();
    expect(screen.getByText("Indigo (Brand)")).toBeDefined();
    expect(screen.getByText("Slate (Surfaces & Text)")).toBeDefined();
  });
});
