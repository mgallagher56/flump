import { Button } from "@repo/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NetWorthHistoryChart } from "./NetWorthHistoryChart";

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

  it("puts the caller's quiet links in one row with Show data, the table opening below the row", () => {
    render(
      <NetWorthHistoryChart
        dataActions={
          <Button size="sm" type="button" variant="link">
            Add earlier months
          </Button>
        }
        dataNote="Next check-in: 1 December 2026"
        points={points}
        recordedMonths={3}
        summary="Net worth."
      />,
    );
    const showData = screen.getByRole("button", { name: "Show data" });
    const link = screen.getByRole("button", { name: "Add earlier months" });
    const row = link.parentElement?.parentElement as HTMLElement;
    expect(row.contains(showData)).toBe(true);
    expect(row.contains(screen.getByText("Next check-in: 1 December 2026"))).toBe(true);
    fireEvent.click(showData);
    expect(row.contains(screen.getByRole("table", { name: "Net worth by month" }))).toBe(true);
  });
});
