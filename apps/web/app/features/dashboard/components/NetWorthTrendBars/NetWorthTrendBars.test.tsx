import { type NetWorthTrend, selectNetWorthTrend } from "@flump/finance-engine";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NetWorthTrendBars } from "./NetWorthTrendBars";

const rec = (month: string, netWorth: number) => ({ month, netWorth, allCarried: false });
const carried = (month: string, netWorth: number) => ({ month, netWorth, allCarried: true });

const trendOf = (points: Parameters<typeof selectNetWorthTrend>[0]): NetWorthTrend => {
  const trend = selectNetWorthTrend(points);
  if (!trend) throw new Error("fixture must draw");
  return trend;
};

const rects = (container: HTMLElement) => [...container.querySelectorAll("rect")];

describe("NetWorthTrendBars", () => {
  it("draws one bar per month at the engine's geometry, the latest solid and the rest outlined", () => {
    // Range 0 to 4,000: 1,000 is top 75 height 25, 2,000 top 50 height 50, 4,000 top 0 height 100.
    const { container } = render(
      <NetWorthTrendBars
        trend={trendOf([rec("2026-09", 1000), rec("2026-10", 2000), rec("2026-11", 4000)])}
      />,
    );
    const bars = rects(container);
    expect(bars.map((r) => [r.getAttribute("y"), r.getAttribute("height")])).toEqual([
      ["75", "25"],
      ["50", "50"],
      ["0", "100"],
    ]);
    // Oldest on the left: 24 wide with a 16 gap, so x steps by 40.
    expect(bars.map((r) => r.getAttribute("x"))).toEqual(["0", "40", "80"]);
    expect(bars.map((r) => r.getAttribute("fill"))).toEqual(["none", "none", "currentColor"]);
    expect(bars.map((r) => r.dataset.latest)).toEqual(["false", "false", "true"]);
    expect(bars[2]?.getAttribute("class")).toContain("text.heroFigure");
    expect(bars[0]?.getAttribute("class")).toContain("text.onHero");
    // The plot is as wide as its bars: 3 * 40 - 16.
    expect(screen.getByTestId("net-worth-trend-plot").getAttribute("viewBox")).toBe("0 0 104 100");
    // The zero line sits at the bottom when every month is positive.
    expect(container.querySelector("[data-zero-line]")?.getAttribute("y1")).toBe("100");
  });

  it("hides the drawing and reads the months and figures plainly instead", () => {
    const { container } = render(
      <NetWorthTrendBars
        trend={trendOf([rec("2026-09", 1000), rec("2026-10", 2000), rec("2026-11", 4000)])}
      />,
    );
    expect(screen.getByTestId("net-worth-trend-plot").getAttribute("aria-hidden")).toBe("true");
    expect(
      screen.getByText("Net worth at your last 3 monthly check-ins, oldest first."),
    ).toBeDefined();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "September 2026: £1,000",
      "October 2026: £2,000",
      "November 2026, the latest: £4,000",
    ]);
    // No direction words, signs or change figures anywhere.
    expect(container.textContent).not.toMatch(/\b(up|down|rose|fell|increase|decrease)\b|%|\+/i);
  });

  it("reads a negative month with the word minus and hangs it below the zero line", () => {
    // Range -1,000 to 3,000: zero 75% down. -1,000 starts on it (top 75), height 25.
    const { container } = render(
      <NetWorthTrendBars
        trend={trendOf([rec("2026-09", -1000), rec("2026-10", 1000), rec("2026-11", 3000)])}
      />,
    );
    expect(container.querySelector("[data-zero-line]")?.getAttribute("y1")).toBe("75");
    const first = rects(container)[0];
    expect([first?.getAttribute("y"), first?.getAttribute("height")]).toEqual(["75", "25"]);
    expect(screen.getAllByRole("listitem")[0]?.textContent).toBe("September 2026: minus £1,000");
  });

  it("leaves one empty slot for a break and says which months were missed", () => {
    // Recorded June, July and October: August and September missed. October moves one slot right
    // (x 120, not 80) and the plot is 4 slots wide: 4 * 40 - 16 = 144.
    const { container } = render(
      <NetWorthTrendBars
        trend={trendOf([
          rec("2026-06", 1000),
          rec("2026-07", 1100),
          carried("2026-08", 1100),
          carried("2026-09", 1100),
          rec("2026-10", 1300),
        ])}
      />,
    );
    expect(rects(container).map((r) => r.getAttribute("x"))).toEqual(["0", "40", "120"]);
    expect(screen.getByTestId("net-worth-trend-plot").getAttribute("viewBox")).toBe("0 0 144 100");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "June 2026: £1,000",
      "July 2026: £1,100",
      "No check-ins from August 2026 to September 2026",
      "October 2026, the latest: £1,300",
    ]);
  });

  it("names a single missed month on its own", () => {
    render(
      <NetWorthTrendBars
        trend={trendOf([rec("2026-08", 1000), rec("2026-09", 1100), rec("2026-11", 1300)])}
      />,
    );
    expect(screen.getByText("No check-in for October 2026")).toBeDefined();
  });

  it("draws no bar for a month at exactly zero, and still lists it", () => {
    const { container } = render(
      <NetWorthTrendBars
        trend={trendOf([rec("2026-09", 0), rec("2026-10", 1000), rec("2026-11", 2000)])}
      />,
    );
    expect(rects(container).map((r) => r.dataset.month)).toEqual(["2026-10", "2026-11"]);
    expect(screen.getAllByRole("listitem")[0]?.textContent).toBe("September 2026: £0");
  });

  it("keeps its system ink under forced colours", () => {
    const { container } = render(
      <NetWorthTrendBars
        trend={trendOf([rec("2026-09", 1000), rec("2026-10", 2000), rec("2026-11", 4000)])}
      />,
    );
    const plot = screen.getByTestId("net-worth-trend-plot");
    expect(plot.getAttribute("class")).toContain("forced-color-adjust_none");
    for (const r of rects(container)) {
      expect(r.getAttribute("class")).toContain("highContrast:c_CanvasText");
    }
  });

  it("uses no inline styles", () => {
    const { container } = render(
      <NetWorthTrendBars
        trend={trendOf([rec("2026-09", 1000), rec("2026-10", 2000), rec("2026-11", 4000)])}
      />,
    );
    expect(container.querySelector("[style]")).toBeNull();
  });
});
