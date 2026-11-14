import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { monthTicks, NetWorthHistoryChart, yTicks } from "./NetWorthHistoryChart";

const points = [
  { month: "2026-07", label: "Jul 26", netWorth: 1000, recorded: 1000, carried: null },
  { month: "2026-08", label: "Aug 26", netWorth: 1100, recorded: 1100, carried: 1100 },
  { month: "2026-09", label: "Sep 26", netWorth: 1100, recorded: null, carried: 1100 },
  { month: "2026-10", label: "Oct 26", netWorth: 1300, recorded: 1300, carried: 1300 },
];

describe("NetWorthHistoryChart", () => {
  it("has no legend and labels carried-forward months in the data table", () => {
    render(<NetWorthHistoryChart points={points} recordedMonths={3} summary="Net worth." />);
    expect(screen.getByTestId("net-worth-history-chart")).toBeDefined();
    expect(screen.queryByTestId("net-worth-history-legend")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Show data/ }));
    expect(screen.getByRole("columnheader", { name: "Source" })).toBeDefined();
    const sep = screen.getByRole("rowheader", { name: "September 2026" }).closest("tr");
    expect(sep?.textContent).toContain("Carried forward");
    expect(sep?.textContent).toContain("£1,100");
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
  });

  it("draws no chart with fewer than 3 recorded months, only the summary and the prompt", () => {
    render(
      <NetWorthHistoryChart
        notEnoughDataText="You have two months of history. The chart appears after your third check-in."
        points={points.slice(0, 2)}
        recordedMonths={2}
        summary="Net worth recorded for August 2026: £1,100."
      />,
    );
    expect(screen.queryByTestId("net-worth-history-chart")).toBeNull();
    expect(screen.queryByRole("button", { name: /Show data/ })).toBeNull();
    expect(screen.getByText("Net worth recorded for August 2026: £1,100.")).toBeDefined();
    expect(
      screen.getByText(
        "You have two months of history. The chart appears after your third check-in.",
      ),
    ).toBeDefined();
  });
});
