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
    render(<NetWorthHistoryChart points={points} summary="Net worth over 4 months." />);
    const legend = screen.getByTestId("net-worth-history-legend");
    expect(legend.textContent).toContain("Recorded");
    expect(legend.textContent).toContain("Carried forward (no check-in)");
    expect(legend.textContent).not.toContain("Projection");
    fireEvent.click(screen.getByRole("button", { name: /Show data/ }));
    const sep = screen.getByRole("rowheader", { name: "September 2026" }).closest("tr");
    expect(sep?.textContent).toContain("Carried forward");
    expect(sep?.textContent).toContain("£1,100");
  });

  it("adds a projection series from a single recorded month", () => {
    render(
      <NetWorthHistoryChart
        points={[
          { month: "2026-10", label: "Oct 26", netWorth: 1000, recorded: 1000, carried: null },
        ]}
        projection={[
          { month: "2026-10", label: "Oct 26", projected: 1000 },
          { month: "2026-11", label: "Nov 26", projected: 1250 },
        ]}
        summary="One month."
      />,
    );
    expect(screen.getByTestId("net-worth-history-legend").textContent).toContain("Projection");
    fireEvent.click(screen.getByRole("button", { name: /Show data/ }));
    expect(
      screen.getByRole("rowheader", { name: "October 2026" }).closest("tr")?.textContent,
    ).toContain("Recorded");
    expect(
      screen.getByRole("rowheader", { name: "November 2026" }).closest("tr")?.textContent,
    ).toContain("Projection");
  });
});
