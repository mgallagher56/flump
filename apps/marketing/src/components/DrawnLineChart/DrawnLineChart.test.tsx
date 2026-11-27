import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MomentTimeline } from "../../motion/moments/arrive";
import { plotPath, pointAt, readoutWidth, shareFromTop } from "./chartGeometry";
import { DrawnLineChart, type DrawnLineChartProps } from "./DrawnLineChart";
import { drawChartMoment, placeChart, settleDrawnCharts } from "./drawChartMoment";

const PROPS: DrawnLineChartProps = {
  id: "test",
  values: [0, 50, 100],
  readouts: ["£0, Jan", "£50, Feb", "£100, Mar"],
  min: 0,
  max: 100,
  ticks: [
    { label: "Jan", index: 0 },
    { label: "Mar", index: 2 },
  ],
  tone: "sky",
};

const chartOf = () => {
  const { container } = render(<DrawnLineChart {...PROPS} />);
  return container.querySelector<HTMLElement>("[data-drawn-chart]") as HTMLElement;
};

describe("chart geometry", () => {
  it("places values from the top of the plot", () => {
    expect(shareFromTop(100, 100)).toBe(0);
    expect(shareFromTop(0, 100)).toBe(1);
    // (75 − 50) / (100 − 50) = 0.5 up, so 0.5 from the top
    expect(shareFromTop(75, 100, 50)).toBe(0.5);
  });

  it("draws a path through evenly spaced points on the 600 by 200 plot", () => {
    expect(plotPath([0, 50, 100], 100)).toBe("M0.00,200.00 L300.00,100.00 L600.00,0.00");
  });

  it("finds where the line has reached, and the nearest point", () => {
    // p 0.25 of two pieces: f = 0.5, halfway from 0 to 50 = 25, so 0.75 from the top
    expect(pointAt([0, 50, 100], 0.25, 100)).toEqual({ x: 0.25, y: 0.75, index: 1 });
    expect(pointAt([0, 50, 100], 1, 100)).toEqual({ x: 1, y: 0, index: 2 });
  });

  it("holds progress to 0 to 1", () => {
    // Below 0 is the first point, above 1 the last.
    expect(pointAt([0, 50, 100], -0.5, 100)).toEqual({ x: 0, y: 1, index: 0 });
    expect(pointAt([0, 50, 100], 1.5, 100)).toEqual({ x: 1, y: 0, index: 2 });
  });

  it("puts a single value at the right edge, and no values at the floor", () => {
    // One value, 40 of 0 to 100: x 1, y 1 − 0.4 = 0.6
    expect(pointAt([40], 0.5, 100)).toEqual({ x: 1, y: 0.6, index: 0 });
    // None: the floor's value, 20 of 20 to 120, is 1 from the top.
    expect(pointAt([], 0.5, 120, 20)).toEqual({ x: 1, y: 1, index: 0 });
  });

  it("puts a flat range at the top instead of dividing by zero", () => {
    // max = min = 50: the range counts as 1, so 1 − (50 − 50) / 1 = 1 and 1 − (51 − 50) / 1 = 0
    expect(shareFromTop(50, 50, 50)).toBe(1);
    expect(shareFromTop(51, 50, 50)).toBe(0);
  });

  it("sizes the readout box to its label", () => {
    // 8 characters × 7.4 + 18 = 77.2, rounded 77
    expect(readoutWidth("£100, Ma")).toBe(77);
  });
});

describe("DrawnLineChart", () => {
  it("renders finished: the whole line, the marker on the last point and its readout", () => {
    const chart = chartOf();
    expect(chart.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(chart.querySelector("[data-chart-clip]")?.getAttribute("width")).toBe("600");
    expect(chart.querySelector("[data-chart-marker]")?.getAttribute("cx")).toBe("100%");
    expect(chart.querySelector("[data-chart-marker]")?.getAttribute("cy")).toBe("0.000%");
    expect(chart.querySelector("[data-readout-text]")?.textContent).toBe("£100, Mar");
    expect(Array.from(chart.querySelectorAll("text")).map((t) => t.textContent)).toEqual([
      "£100, Mar",
      "Jan",
      "Mar",
    ]);
  });
});

describe("drawChartMoment", () => {
  it("draws the line from nothing on the calm in-out ease, once, inside the timeline", () => {
    const chart = chartOf();
    const fromTo = vi.fn();
    drawChartMoment(
      { fromTo } as unknown as MomentTimeline,
      chart.parentElement as HTMLElement,
      0.3,
      1.8,
    );
    const [state, from, to, at] = fromTo.mock.calls[0] as [
      { p: number },
      { p: number },
      { p: number; duration: number; ease: string; onUpdate: () => void },
      number,
    ];
    expect(from).toEqual({ p: 0 });
    expect(to.p).toBe(1);
    expect(to.ease).toBe("calmInOut");
    expect(to.duration).toBe(1.8);
    expect(at).toBe(0.3);
    // A quarter of the way: the clip is 150 wide and the readout names the nearest point.
    state.p = 0.25;
    to.onUpdate();
    expect(chart.querySelector("[data-chart-clip]")?.getAttribute("width")).toBe("150");
    expect(chart.querySelector("[data-readout-text]")?.textContent).toBe("£50, Feb");
    // Before the middle the readout sits to the marker's right.
    expect(chart.querySelector("[data-readout-box]")?.getAttribute("x")).toBe("0");
  });

  it("puts a chart left part-way back to finished", () => {
    const chart = chartOf();
    placeChart(chart, 0.2);
    settleDrawnCharts(chart.parentElement as HTMLElement);
    expect(chart.querySelector("[data-chart-clip]")?.getAttribute("width")).toBe("600");
    expect(chart.querySelector("[data-readout-text]")?.textContent).toBe("£100, Mar");
    expect(chart.querySelector("[data-readout-box]")?.getAttribute("x")).toBe(
      String(-readoutWidth("£100, Mar")),
    );
  });
});
