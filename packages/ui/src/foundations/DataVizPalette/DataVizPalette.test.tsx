import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataVizPalette } from "./DataVizPalette";

describe("DataVizPalette", () => {
  it("renders swatches for series1-8, projection, band and baseline", () => {
    render(<DataVizPalette />);
    for (let i = 1; i <= 8; i++) expect(screen.getByTestId(`swatch-series${i}`)).toBeDefined();
    for (const role of ["projection", "band", "baseline"]) {
      expect(screen.getByTestId(`swatch-${role}`)).toBeDefined();
    }
  });

  it("renders a legend entry for every series and the projection", () => {
    render(<DataVizPalette />);
    const legend = screen.getByRole("list", { name: "Legend" });
    const items = within(legend).getAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual([
      "Pension",
      "ISA",
      "Cash",
      "Projection (assumes 5%)",
      "Target",
    ]);
  });

  it("labels the chart and states the assumption", () => {
    render(<DataVizPalette />);
    expect(screen.getByRole("img", { name: /Line chart of pension/ })).toBeDefined();
    expect(screen.getByText(/Assumes 5% annual growth/)).toBeDefined();
  });

  it("uses distinct non-colour cues (dash) for the ISA and projection lines", () => {
    const { container } = render(<DataVizPalette />);
    const dashed = container.querySelectorAll("path[stroke-dasharray]");
    expect(dashed.length).toBeGreaterThanOrEqual(2);
  });
});
