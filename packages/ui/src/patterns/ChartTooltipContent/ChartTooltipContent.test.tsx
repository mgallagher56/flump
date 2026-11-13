import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartTooltipContent } from "./ChartTooltipContent";

describe("ChartTooltipContent", () => {
  it("renders the title and a row per series with en-GB money", () => {
    render(
      <ChartTooltipContent
        rows={[
          { id: "nw", label: "Net worth", color: "primary", value: 48250 },
          { id: "debt", label: "Debt", color: "debt", value: -6200.5, swatch: "dashed" },
        ]}
        title="Mar 2026"
      />,
    );
    expect(screen.getByText("Mar 2026")).toBeDefined();
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as HTMLElement).getByText("£48,250")).toBeDefined();
    expect(within(rows[1] as HTMLElement).getByText("Debt")).toBeDefined();
  });

  it("reads Not set for unknown values, never £0", () => {
    render(
      <ChartTooltipContent
        rows={[
          { id: "a", label: "Savings", color: "wealth", value: null },
          { id: "b", label: "Pension", color: "series3", value: Number.NaN },
        ]}
      />,
    );
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("supports two decimal places", () => {
    render(
      <ChartTooltipContent
        fractionDigits={2}
        rows={[{ id: "a", label: "Fee", color: "debt", value: 12.5 }]}
      />,
    );
    expect(screen.getByText("£12.50")).toBeDefined();
  });

  it("omits the title when none is given", () => {
    const { container } = render(
      <ChartTooltipContent rows={[{ id: "a", label: "A", color: "primary", value: 1 }]} />,
    );
    expect(container.querySelector("p")).toBeNull();
  });
});
