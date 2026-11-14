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

  it("lists the E16 page template tokens", () => {
    render(<SpacingAndRadii />);
    expect(screen.getByText("Page template")).toBeDefined();
    expect(screen.getByTestId("page-row-sizes.page.max").textContent).toContain("1200px");
    expect(screen.getByTestId("page-row-spacing.page.gutter.lg").textContent).toContain("40px");
  });

  it("renders both density panels", () => {
    render(<SpacingAndRadii />);
    expect(screen.getByTestId("density-comfortable").getAttribute("data-density")).toBe(
      "comfortable",
    );
    expect(screen.getByTestId("density-compact").getAttribute("data-density")).toBe("compact");
  });

  it("lists every density-aware radius with its comfortable and compact value", () => {
    render(<SpacingAndRadii />);
    expect(screen.getByTestId("radii-row-xl").textContent).toBe("radii.xl: 16px / 8px");
    expect(screen.getByTestId("radii-row-2xl").textContent).toBe("radii.2xl: 24px / 12px");
    for (const density of ["comfortable", "compact"]) {
      for (const alias of ["control", "card", "tray"]) {
        expect(screen.getByTestId(`radius-${alias}-${density}`)).toBeDefined();
      }
    }
  });
});
