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
  it("labels recorded and carried-forward months in the key and the data table", () => {
    render(<NetWorthHistoryChart points={points} recordedMonths={3} summary="Net worth." />);
    expect(screen.getByTestId("net-worth-history-chart")).toBeDefined();
    const legend = screen.getByTestId("net-worth-history-legend");
    expect(legend.textContent).toContain("Recorded");
    expect(legend.textContent).toContain("Carried forward (no check-in)");
    fireEvent.click(screen.getByRole("button", { name: /Show data/ }));
    expect(screen.getByRole("columnheader", { name: "Source" })).toBeDefined();
    const sep = screen.getByRole("rowheader", { name: "September 2026" }).closest("tr");
    expect(sep?.textContent).toContain("Carried forward");
    expect(sep?.textContent).toContain("£1,100");
  });

  it("has no key when every month is recorded", () => {
    render(
      <NetWorthHistoryChart
        points={points.map((p) => ({ ...p, recorded: p.netWorth, carried: null }))}
        recordedMonths={4}
        summary="Net worth."
      />,
    );
    expect(screen.queryByTestId("net-worth-history-legend")).toBeNull();
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
