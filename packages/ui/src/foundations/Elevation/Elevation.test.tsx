import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Elevation } from "./Elevation";

describe("Elevation Foundation", () => {
  it("renders every elevation level", () => {
    render(<Elevation />);
    expect(screen.getByRole("heading", { name: "Elevation" })).toBeDefined();
    for (const level of ["xs", "card", "raised", "overlay", "focus"]) {
      expect(screen.getByTestId(`elevation-${level}`)).toBeDefined();
    }
  });

  it("renders the levels in both densities", () => {
    render(<Elevation />);
    expect(screen.getByTestId("elevation-density-compact").getAttribute("data-density")).toBe(
      "compact",
    );
    for (const level of ["xs", "card", "raised", "overlay", "focus"]) {
      expect(screen.getByTestId(`elevation-${level}-compact`)).toBeDefined();
    }
  });
});
