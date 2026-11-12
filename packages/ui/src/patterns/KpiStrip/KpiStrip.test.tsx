import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiStrip } from "./KpiStrip";

describe("KpiStrip Pattern", () => {
  it("renders children in horizontal grid", () => {
    render(
      <KpiStrip columns={4}>
        <div>Metric A</div>
        <div>Metric B</div>
      </KpiStrip>,
    );
    expect(screen.getByText("Metric A")).toBeDefined();
    expect(screen.getByText("Metric B")).toBeDefined();
  });

  it("uses compact density", () => {
    const { container } = render(
      <KpiStrip>
        <div>Metric A</div>
      </KpiStrip>,
    );
    expect(container.firstElementChild?.getAttribute("data-density")).toBe("compact");
  });

  it.each([1, 2, 3, 4] as const)("supports %i columns", (columns) => {
    const { container } = render(
      <KpiStrip columns={columns}>
        <div>Metric</div>
      </KpiStrip>,
    );
    expect(container.firstElementChild?.className).toContain("grid-tc_");
  });

  it("renders every child even when there are more than four", () => {
    render(
      <KpiStrip columns={4}>
        {["A", "B", "C", "D", "E"].map((n) => (
          <div key={n}>Metric {n}</div>
        ))}
      </KpiStrip>,
    );
    expect(screen.getAllByText(/Metric [A-E]/)).toHaveLength(5);
  });
});
