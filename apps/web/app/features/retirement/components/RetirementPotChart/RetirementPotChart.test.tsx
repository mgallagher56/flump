import type { RetirementAccumulationPoint } from "@flump/finance-engine";
import { countFigures } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { evenTicks, potChartRows, RetirementPotChart, zeroBasedAxis } from "./RetirementPotChart";

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

const points = (years: number): RetirementAccumulationPoint[] =>
  Array.from({ length: years + 1 }, (_, y) => ({
    age: 40 + y,
    yearIndex: y,
    potGbp: { lower: 50_000 + y * 9_000, middle: 50_000 + y * 10_123, higher: 50_000 + y * 12_000 },
    paidInGbp: 50_000 + y * 6_000,
  }));

describe("<RetirementPotChart />", () => {
  it("splits each year into paid in and growth for the chosen case, growth floored at zero", () => {
    const rows = potChartRows(
      [
        { age: 40, yearIndex: 0, potGbp: { lower: 100, middle: 100, higher: 100 }, paidInGbp: 100 },
        { age: 41, yearIndex: 1, potGbp: { lower: 90, middle: 130, higher: 150 }, paidInGbp: 110 },
      ],
      "lower",
    );
    expect(rows[1]).toEqual({ age: 41, yearIndex: 1, pot: 90, paidIn: 110, growth: 0 });
    expect(potChartRows(points(1), "higher")[1]?.growth).toBe(6_000);
  });

  it("is a named figure with a one-line summary holding one rounded figure", () => {
    const { container } = render(<RetirementPotChart points={points(20)} growthCase="middle" />);
    const figure = screen.getByRole("figure", { name: "Pot each year" });
    // 50,000 + 20 x 10,123 = 252,460, shown to three significant figures.
    const summary = screen.getByText("Reaches ~£252,000 at retirement, in today's prices.");
    expect(figure.contains(summary)).toBe(true);
    expect(countFigures(container)).toBe(1);
    const key = screen.getByRole("list", { name: "Chart key" });
    expect(within(key).getByText("Paid in")).toBeTruthy();
    expect(within(key).getByText("Growth")).toBeTruthy();
  });

  it("keeps the year table behind Show data, with today's row exact and later rows rounded", () => {
    render(<RetirementPotChart points={points(20)} growthCase="middle" />);
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show data/ }));
    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((h) => h.textContent);
    expect(headers).toEqual(["Age", "Estimated pot", "Paid in", "Growth"]);
    const rows = within(table).getAllByRole("row");
    expect(rows[1]?.textContent).toBe("40£50,000£50,000£0");
    expect(rows[2]?.textContent).toBe("41~£60,100~£56,000~£4,120");
  });

  it("draws no chart for fewer than three points", () => {
    render(<RetirementPotChart points={points(1)} growthCase="middle" />);
    expect(screen.getByText(/not enough figures/i)).toBeTruthy();
  });

  it("uses even age steps that end on the retirement age", () => {
    const ages = Array.from({ length: 28 }, (_, i) => 40 + i);
    expect(evenTicks(ages)).toEqual([47, 57, 67]);
    expect(evenTicks(ages, 3)).toHaveLength(3);
  });

  it("starts the axis at zero, so the stacked fill never overstates growth", () => {
    const axis = zeroBasedAxis(252_460);
    expect(axis.domain[0]).toBe(0);
    expect(axis.ticks[0]).toBe(0);
    expect(axis.domain[1]).toBeGreaterThanOrEqual(252_460);
    expect(axis.ticks.length).toBeLessThanOrEqual(5);
  });
});
