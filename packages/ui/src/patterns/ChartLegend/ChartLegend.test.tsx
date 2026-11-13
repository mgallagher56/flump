import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChartLegend, ChartSwatch, resolveChartColor } from "./ChartLegend";

const ITEMS = [
  { id: "assets", label: "Net worth", color: "primary" as const },
  { id: "savings", label: "Savings", color: "wealth" as const, swatch: "area" as const },
  {
    id: "projection",
    label: "Projection",
    color: "projection" as const,
    swatch: "dashed" as const,
  },
];

describe("ChartLegend", () => {
  it("renders a named list with one item per series", () => {
    render(<ChartLegend items={ITEMS} />);
    const list = screen.getByRole("list", { name: "Chart key" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("Projection")).toBeDefined();
  });

  it("accepts a custom list name", () => {
    render(<ChartLegend items={ITEMS} label="Accounts key" />);
    expect(screen.getByRole("list", { name: "Accounts key" })).toBeDefined();
  });

  it("uses the swatch shape, not only colour, to identify a series", () => {
    const { container } = render(<ChartLegend items={ITEMS} />);
    const swatches = [...container.querySelectorAll("svg")].map((s) =>
      s.getAttribute("data-swatch"),
    );
    expect(swatches).toEqual(["line", "area", "dashed"]);
    expect(
      container.querySelector("[data-swatch='dashed'] line")?.getAttribute("stroke-dasharray"),
    ).toBe("5 4");
  });

  it("colours swatches from chart tokens", () => {
    const { container } = render(<ChartLegend items={ITEMS} />);
    expect(container.querySelector("line")?.getAttribute("stroke")).toBe(
      "var(--colors-chart-primary)",
    );
    expect(resolveChartColor("accentPurple")).toBe("var(--colors-chart-accent-purple)");
    expect(resolveChartColor("var(--x)")).toBe("var(--x)");
  });

  it("shows values in en-GB money, and Not set for null", () => {
    render(
      <ChartLegend
        items={[
          { id: "a", label: "Net worth", color: "primary", value: 1234567 },
          { id: "b", label: "Debt", color: "debt", value: null },
        ]}
      />,
    );
    expect(screen.getByText("£1,234,567")).toBeDefined();
    expect(screen.getByText("Not set")).toBeDefined();
  });

  it("derives id and test ids from the id prop", () => {
    render(<ChartLegend id="net-worth-key" items={ITEMS} />);
    const list = screen.getByRole("list", { name: "Chart key" });
    expect(list.id).toBe("net-worth-key");
    expect(list.getAttribute("data-testid")).toBe("net-worth-key");
    expect(screen.getByTestId("net-worth-key-projection")).toBeDefined();
  });

  it("hides swatches from assistive tech", () => {
    const { container } = render(<ChartSwatch color="debt" />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
