import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpacingAndRadii } from "./SpacingAndRadii";

describe("SpacingAndRadii Foundation", () => {
  it("renders spacing, border radii, and elevation sections", () => {
    render(<SpacingAndRadii />);
    expect(screen.getByText("Spacing, Border Radii & Elevation")).toBeDefined();
    expect(screen.getByText("4px Geometric Spacing Scale")).toBeDefined();
    expect(screen.getByText("Border Radii Scale")).toBeDefined();
  });
});
