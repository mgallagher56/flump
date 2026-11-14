import { ChartFigure } from "@repo/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { endLabelDy, MonthLinePlot, monthTicks, yTicks } from "./MonthLinePlot";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

const points = [
  { month: "2026-08", label: "Aug 26", netWorth: 1000, recorded: 1000, carried: null },
  { month: "2026-09", label: "Sep 26", netWorth: 1100, recorded: 1100, carried: 1100 },
  { month: "2026-10", label: "Oct 26", netWorth: 1300, recorded: null, carried: 1300 },
];

describe("MonthLinePlot", () => {
  it("draws inside a ChartFigure with the given id as id and test id", () => {
    render(
      <ChartFigure minPoints={2} pointCount={3} summary="Balance." title="Balance history">
        <MonthLinePlot id="balance-plot" points={points} valueName="Balance" />
      </ChartFigure>,
    );
    const plot = screen.getByTestId("balance-plot");
    expect(plot.id).toBe("balance-plot");
  });

  it("defaults to the net worth history id", () => {
    render(
      <ChartFigure minPoints={2} pointCount={3} summary="Net worth." title="Net worth over time">
        <MonthLinePlot points={points} />
      </ChartFigure>,
    );
    expect(screen.getByTestId("net-worth-history-chart")).toBeDefined();
  });

  it("spaces x ticks evenly from the last month, at most the tick limit", () => {
    const seven = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
    expect(monthTicks(seven, 6)).toEqual(["May", "Jul", "Sep", "Nov"]);
    expect(monthTicks(seven.slice(1), 6)).toEqual(seven.slice(1));
    expect(
      monthTicks(
        Array.from({ length: 13 }, (_, i) => i),
        6,
      ),
    ).toEqual([0, 3, 6, 9, 12]);
  });

  it("puts y ticks on round steps inside the domain", () => {
    expect(yTicks([210000, 236000])).toEqual([210000, 220000, 230000]);
    expect(yTicks([0, 20000])).toEqual([0, 5000, 10000, 15000, 20000]);
    expect(yTicks([-10000, 10000])).toEqual([-10000, -5000, 0, 5000, 10000]);
    expect(yTicks([5, 5])).toEqual([5]);
  });
});

describe("endLabelDy", () => {
  const dot = { x: 500, y: 100 };
  it("keeps the default offset when the line rises into the end point", () => {
    // Pixel y grows downwards: the earlier point is lower on screen.
    expect(endLabelDy(dot, [{ x: 400, y: 150 }, dot], 80, -14)).toBe(-14);
  });

  it("lifts the label clear of a line that comes down into the end point", () => {
    // 80px left of the dot the line is 40 * 80 / 100 = 32px above it, plus the 8px gap.
    expect(endLabelDy(dot, [{ x: 400, y: 60 }, dot], 80, -14)).toBeCloseTo(-40);
  });

  it("uses the highest point of the line within the label's span", () => {
    const line = [{ x: 300, y: 100 }, { x: 440, y: 50 }, dot];
    expect(endLabelDy(dot, line, 100, -14)).toBe(-58);
  });
});
