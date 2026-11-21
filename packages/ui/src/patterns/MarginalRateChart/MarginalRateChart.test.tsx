import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lineLabelSpot, MarginalRateChart, markersNearPay, yTicksFor } from "./MarginalRateChart";
import {
  SAMPLE_POINTS,
  SAMPLE_SUMMARY,
  SAMPLE_THRESHOLDS,
  SAMPLE_ZONES,
} from "./MarginalRateChart.fixtures";

const renderChart = (props: Partial<React.ComponentProps<typeof MarginalRateChart>> = {}) =>
  render(
    <MarginalRateChart
      points={SAMPLE_POINTS}
      steppedZones={SAMPLE_ZONES}
      summary={SAMPLE_SUMMARY}
      thresholds={SAMPLE_THRESHOLDS}
      title="Estimated share deducted from the next £1,000, by pay"
      yourPay={39_000}
      {...props}
    />,
  );

describe("MarginalRateChart", () => {
  it("in the zone draws one marker, no thresholds or axis title, and names the line at its end", () => {
    renderChart({ variant: "zone", steppedZones: [], yourPay: 32_000 });
    expect(screen.queryAllByTestId("marginal-rate-threshold")).toHaveLength(0);
    expect(screen.getByTestId("marginal-rate-your-pay")).toBeDefined();
    expect(screen.queryByText("Pay before tax")).toBeNull();
    const label = screen.getByTestId("marginal-rate-line-label");
    expect(label.getAttribute("text-anchor")).toBe("end");
  });

  it("starts the line where a fall at the very start ends", () => {
    renderChart({
      points: [{ gross: 0, ratePct: 100 }, { gross: 250, ratePct: 100 }, ...SAMPLE_POINTS.slice(2)],
    });
    const line = screen.getByTestId("marginal-rate-line").getAttribute("points") ?? "";
    expect(line.split(" ")).toHaveLength(SAMPLE_POINTS.length - 2);
    // The 100% edge value at £0 no longer sets the top of the axis.
    expect(screen.queryByText("100%")).toBeNull();
  });

  it("is a named figure with the caller's summary", () => {
    renderChart();
    expect(
      screen.getByRole("figure", {
        name: "Estimated share deducted from the next £1,000, by pay",
      }),
    ).toBeDefined();
    expect(screen.getByText(SAMPLE_SUMMARY)).toBeDefined();
  });

  it("draws one marker per threshold gross pay, each named with its labels and gross pay", () => {
    renderChart();
    const markers = screen.getAllByTestId("marginal-rate-threshold");
    // £12,570, £50,270 and £125,140 each carry two thresholds.
    expect(markers).toHaveLength(6);
    const names = markers.map((m) => m.querySelector("title")?.textContent);
    expect(names).toContain("Income Tax starts; National Insurance starts: £12,570 pay before tax");
    expect(names).toContain("Personal Allowance starts to reduce: £100,000 pay before tax");
  });

  it("marks your pay and the stepped zone", () => {
    renderChart();
    const you = screen.getByTestId("marginal-rate-your-pay");
    expect(you.textContent).toContain("Your pay");
    expect(you.querySelector("title")?.textContent).toBe("Your pay: £39,000");
    expect(screen.getAllByTestId("marginal-rate-stepped-zone")).toHaveLength(1);
  });

  it("places the line label at the left end of the widest gap between vertical lines", () => {
    // The widest gap wins, and the label starts just after the line on its left.
    expect(lineLabelSpot([100, 380], 40, 400, 90)).toEqual({ x: 106, clear: true });
    expect(lineLabelSpot([100, 200], 40, 400, 90)).toEqual({ x: 206, clear: true });
    // No gap wide enough: the widest one still, kept inside the plot.
    expect(lineLabelSpot([60, 90, 120], 40, 140, 90)).toEqual({ x: 50, clear: false });
  });

  it("anchors the line label at the start of the higher rate plateau, above the line", () => {
    // Without Child Benefit the plateau runs from the higher rate to the taper at £100,000.
    renderChart({ thresholds: SAMPLE_THRESHOLDS.filter((t) => !t.label.includes("Child")) });
    const label = screen.getByTestId("marginal-rate-line-label");
    expect(label.getAttribute("text-anchor")).toBe("start");
    // Default width 600: plot from 46 to 586 over £150,000, so £50,270 sits at 227.0; plus 6.
    expect(Number(label.getAttribute("x"))).toBeCloseTo(46 + (50_270 / 150_000) * 540 + 6, 1);
    // Above the 42% plateau, not the 62% step after it.
    const line = screen.getByTestId("marginal-rate-line");
    const plateauY = Number(
      line
        .getAttribute("points")
        ?.split(" ")
        .find((pt) => pt.startsWith("272."))
        ?.split(",")[1],
    );
    const labelY = Number(label.getAttribute("y"));
    expect(labelY).toBeLessThan(plateauY);
    expect(plateauY - labelY).toBeLessThan(20);
  });

  it("never writes the line label over the Your pay text, even when the line runs near the top", () => {
    // A line near 95% everywhere puts any label in the row where "Your pay" is written.
    const flatHigh = Array.from({ length: 61 }, (_, i) => ({ gross: i * 2500, ratePct: 95 }));
    renderChart({ points: flatHigh, thresholds: [], steppedZones: [], yourPay: 20_000 });
    const label = screen.getByTestId("marginal-rate-line-label");
    const yourPay = screen.getByTestId("marginal-rate-your-pay").querySelector("text") as Element;
    const lx = Number(label.getAttribute("x"));
    const labelW = "Share deducted".length * 7;
    const px = Number(yourPay.getAttribute("x"));
    const payHalf = ("Your pay".length * 7) / 2;
    const overlapsX = lx < px + payHalf && lx + labelW > px - payHalf;
    const labelY = Number(label.getAttribute("y"));
    const payY = Number(yourPay.getAttribute("y"));
    expect(overlapsX && Math.abs(labelY - payY) < 14).toBe(false);
  });

  it("can leave out its own Show data and thresholds line when the caller shows them", () => {
    renderChart({ showDataTable: false, showThresholdNote: false });
    expect(screen.queryByRole("button", { name: "Show data" })).toBeNull();
    expect(screen.queryByText(/Each dashed line marks a threshold/)).toBeNull();
  });

  it("can keep the summary for screen readers only", () => {
    renderChart({ showSummary: false });
    const figure = screen.getByRole("figure");
    const summary = document.getElementById(figure.getAttribute("aria-describedby") ?? "");
    expect(summary?.textContent).toBe(SAMPLE_SUMMARY);
    expect(summary?.className).not.toContain("textStyle_body.sm");
  });

  it("labels the line, your pay and the stepped zone directly, with no legend", () => {
    const { container } = renderChart();
    expect(screen.getByTestId("marginal-rate-line-label").textContent).toBe("Share deducted");
    expect(screen.getByTestId("marginal-rate-zone-label").textContent).toBe(SAMPLE_ZONES[0]?.label);
    expect(container.querySelector('[data-testid="chart-legend"], ul[aria-label]')).toBeNull();
    expect(screen.getByText(/Each dashed line marks a threshold/)).toBeDefined();
  });

  it("does not repeat the title as an axis label", () => {
    renderChart();
    const title = "Estimated share deducted from the next £1,000, by pay";
    expect(screen.getAllByText(/Estimated share deducted from the next £1,000/)).toHaveLength(1);
    expect(screen.getByRole("heading", { name: title })).toBeDefined();
  });

  it("gives the title the heading text style, which carries word spacing", () => {
    renderChart();
    const figure = screen.getByRole("figure");
    expect(figure.className).toMatch(/textStyle_heading\.sm/);
  });

  it("leaves out the your-pay marker beyond the chart range", () => {
    renderChart({ yourPay: 200_000 });
    expect(screen.queryByTestId("marginal-rate-your-pay")).toBeNull();
  });

  it("shows a tooltip on hover and hides it on leave", () => {
    renderChart();
    expect(screen.queryByTestId("marginal-rate-tooltip")).toBeNull();
    const marker = screen.getAllByTestId("marginal-rate-threshold-hit")[1] as Element;
    fireEvent.mouseEnter(marker);
    expect(screen.getByTestId("marginal-rate-tooltip").textContent).toBe(
      "Higher rate (40%); National Insurance upper limit: £50,270 pay before tax",
    );
    fireEvent.mouseLeave(marker);
    expect(screen.queryByTestId("marginal-rate-tooltip")).toBeNull();
  });

  it("shows the tooltip on keyboard focus, closes it on Escape and on blur", () => {
    renderChart();
    const marker = screen.getAllByTestId("marginal-rate-threshold-hit")[0] as HTMLElement;
    expect(marker.getAttribute("aria-label")).toBe(
      "Income Tax starts; National Insurance starts: £12,570 pay before tax",
    );
    fireEvent.focus(marker);
    expect(screen.getByTestId("marginal-rate-tooltip").textContent).toContain("£12,570");
    fireEvent.keyDown(marker, { key: "Escape" });
    expect(screen.queryByTestId("marginal-rate-tooltip")).toBeNull();
    fireEvent.focus(marker);
    expect(screen.getByTestId("marginal-rate-tooltip")).toBeDefined();
    fireEvent.blur(marker);
    expect(screen.queryByTestId("marginal-rate-tooltip")).toBeNull();
  });

  it("keeps the open tooltip on the same threshold when markers change", () => {
    const { rerender } = renderChart();
    fireEvent.mouseEnter(screen.getAllByTestId("marginal-rate-threshold-hit")[1] as Element);
    rerender(
      <MarginalRateChart
        points={SAMPLE_POINTS}
        summary={SAMPLE_SUMMARY}
        thresholds={SAMPLE_THRESHOLDS.slice(2)}
        title="Estimated share deducted from the next £1,000, by pay"
      />,
    );
    expect(screen.getByTestId("marginal-rate-tooltip").textContent).toContain("£50,270");
  });

  it("gives each hover target a 24px-wide area and uses no inline styles", () => {
    const { container } = renderChart();
    const hit = screen.getAllByTestId("marginal-rate-threshold-hit")[0] as HTMLElement;
    expect(hit.parentElement?.getAttribute("width")).toBe("24");
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("formats axis ticks en-GB", () => {
    renderChart();
    const svgText = Array.from(document.querySelectorAll("svg text")).map((t) => t.textContent);
    for (const tick of ["£0", "£50k", "£100k", "£150k", "0%", "25%", "50%", "75%"]) {
      expect(svgText).toContain(tick);
    }
    // The sample curve tops out at 62%, so the axis stops at 75%, not 100%.
    expect(svgText).not.toContain("100%");
  });

  it("ends the y axis at the first 25% step at or above the highest rate", () => {
    expect(yTicksFor([0, 28, 62])).toEqual([0, 25, 50, 75]);
    expect(yTicksFor([0, 100, 42])).toEqual([0, 25, 50, 75, 100]);
    expect(yTicksFor([0, 0])).toEqual([0, 25]);
    expect(yTicksFor([0, 140])).toEqual([0, 25, 50, 75, 100]);
  });

  it("draws every threshold by default", () => {
    renderChart();
    // Nine thresholds in six groups (shared pay levels share one marker).
    expect(screen.getAllByTestId("marginal-rate-threshold")).toHaveLength(6);
  });

  it("with thresholdFocus near-pay, draws only the thresholds either side of your pay", () => {
    renderChart({ thresholdFocus: "near-pay", yourPay: 58_000 });
    const names = screen
      .getAllByTestId("marginal-rate-threshold-hit")
      .map((b) => b.getAttribute("aria-label") ?? "");
    expect(names).toHaveLength(2);
    expect(names[0]).toMatch(/£50,270/);
    expect(names[1]).toMatch(/£60,000/);
  });

  it("near-pay leaves out a threshold more than a fifth of the axis from your pay", () => {
    // Without Child Benefit, at £85,000 the threshold above is £100,000 (£15,000 away, drawn) and
    // the one below is £50,270 (£34,730 away, more than £30,000: left out).
    renderChart({
      thresholdFocus: "near-pay",
      yourPay: 85_000,
      thresholds: SAMPLE_THRESHOLDS.filter((t) => !t.label.startsWith("Child Benefit")),
      steppedZones: [],
    });
    const names = screen
      .getAllByTestId("marginal-rate-threshold-hit")
      .map((b) => b.getAttribute("aria-label") ?? "");
    expect(names).toHaveLength(1);
    expect(names[0]).toMatch(/£100,000/);
  });

  it("near-pay falls back to every threshold when your pay is not on the chart", () => {
    renderChart({ thresholdFocus: "near-pay", yourPay: undefined });
    expect(screen.getAllByTestId("marginal-rate-threshold")).toHaveLength(6);
  });

  it("markersNearPay keeps the nearest marker below and above", () => {
    const m = [10, 20, 30].map((gross) => ({ gross, name: String(gross) }));
    expect(markersNearPay(m, 25).map((x) => x.gross)).toEqual([20, 30]);
    expect(markersNearPay(m, 5).map((x) => x.gross)).toEqual([10]);
    expect(markersNearPay(m, 35).map((x) => x.gross)).toEqual([30]);
    expect(markersNearPay(m, 25, 4).map((x) => x.gross)).toEqual([]);
    expect(markersNearPay(m, 27, 4).map((x) => x.gross)).toEqual([30]);
  });

  it("puts a 31-row table, every £5,000, behind Show data", () => {
    renderChart();
    fireEvent.click(screen.getByRole("button", { name: "Show data" }));
    const table = screen.getByRole("table");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(31);
    expect(screen.getByRole("columnheader", { name: "Pay before tax" })).toBeDefined();
    expect(
      screen.getByRole("columnheader", { name: "Estimated share deducted from the next £1,000" }),
    ).toBeDefined();
    expect(screen.getByRole("rowheader", { name: "£50,000" })).toBeDefined();
  });

  it("reserves the drawing's height in CSS from the chart's width, so nothing moves (P61)", () => {
    renderChart();
    const area = screen.getByTestId("marginal-rate-chart");
    const svg = area.querySelector("svg") as SVGElement;
    expect(area.className).toContain("cq-t_inline-size");
    const cls = svg.getAttribute("class") ?? "";
    expect(cls).toContain("h_280px");
    expect(cls).toContain("[@container_(max-width:_479.98px)]:h_200px");
    expect(cls).not.toContain("h_auto");
  });
});

describe("MarginalRateChart data handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const hitNames = () =>
    screen
      .getAllByTestId("marginal-rate-threshold-hit")
      .map((b) => b.getAttribute("aria-label") ?? "");

  it("leaves out thresholds below zero, past the axis or not a number", () => {
    renderChart({
      steppedZones: [],
      thresholds: [
        { gross: -1, label: "Below zero" },
        { gross: Number.NaN, label: "Not a number" },
        { gross: Number.POSITIVE_INFINITY, label: "Endless" },
        { gross: 150_001, label: "Past the axis" },
        { gross: 50_000, label: "On the axis" },
      ],
    });
    expect(hitNames()).toEqual(["On the axis: £50,000 pay before tax"]);
  });

  it("orders the markers by pay, so Tab moves left to right", () => {
    renderChart({
      steppedZones: [],
      thresholds: [
        { gross: 100_000, label: "Later" },
        { gross: 12_570, label: "Earlier" },
      ],
    });
    expect(hitNames()).toEqual([
      "Earlier: £12,570 pay before tax",
      "Later: £100,000 pay before tax",
    ]);
  });

  it("markersNearPay counts a marker at the pay itself as the one below", () => {
    const m = [10, 20, 30].map((gross) => ({ gross, name: String(gross) }));
    expect(markersNearPay(m, 20).map((x) => x.gross)).toEqual([20, 30]);
    // 25 is 5 from both 20 and 30, so with a reach of 5 both are near.
    expect(markersNearPay(m, 25, 5).map((x) => x.gross)).toEqual([20, 30]);
  });

  it("ignores a rate that is not a number when choosing the y axis", () => {
    // The highest real rate is 40%, so the axis ends at the first 25% step above it: 50%.
    expect(yTicksFor([0, Number.NaN, 40])).toEqual([0, 25, 50]);
  });

  it("labels the pay axis in thirds of the highest pay, rounded to £10,000", () => {
    renderChart();
    // £150,000 / 3 = £50,000, already a multiple of £10,000: ticks at £0, £50k, £100k and £150k.
    const money = Array.from(document.querySelectorAll("svg text"))
      .map((t) => t.textContent ?? "")
      .filter((t) => t.startsWith("£"));
    expect(money).toEqual(["£0", "£50k", "£100k", "£150k"]);
  });

  it("sizes the drawing to its container, shorter on a phone and never narrower than 300px", () => {
    let width = 400;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ width }) as DOMRect,
    );
    const svg = () => screen.getByTestId("marginal-rate-chart").querySelector("svg") as SVGElement;
    const first = renderChart();
    // 400px is under the 480px phone width: 200px tall.
    expect(svg().getAttribute("width")).toBe("400");
    expect(svg().getAttribute("height")).toBe("200");
    first.unmount();
    width = 480;
    const second = renderChart();
    expect(svg().getAttribute("height")).toBe("280");
    second.unmount();
    width = 100;
    renderChart();
    expect(svg().getAttribute("width")).toBe("300");
  });

  it("shows the summary under the title by default", () => {
    renderChart();
    const figure = screen.getByRole("figure");
    const summary = document.getElementById(figure.getAttribute("aria-describedby") ?? "");
    expect(summary?.className).toContain("textStyle_body.sm");
  });

  it("redraws the axis when the points change", () => {
    const { rerender } = renderChart();
    expect(screen.queryByText("100%")).toBeNull();
    rerender(
      <MarginalRateChart
        points={[
          { gross: 0, ratePct: 0 },
          { gross: 75_000, ratePct: 90 },
          { gross: 150_000, ratePct: 90 },
        ]}
        summary={SAMPLE_SUMMARY}
        thresholds={SAMPLE_THRESHOLDS}
        title="Estimated share deducted from the next £1,000, by pay"
      />,
    );
    expect(screen.getByText("100%")).toBeDefined();
  });

  it("redraws the markers when the thresholds change", () => {
    const { rerender } = renderChart();
    rerender(
      <MarginalRateChart
        points={SAMPLE_POINTS}
        summary={SAMPLE_SUMMARY}
        thresholds={SAMPLE_THRESHOLDS.slice(2)}
        title="Estimated share deducted from the next £1,000, by pay"
      />,
    );
    // Dropping the two £12,570 thresholds leaves five pay levels.
    expect(screen.getAllByTestId("marginal-rate-threshold")).toHaveLength(5);
  });

  it("marks your pay at the top of the axis, and not below zero or when it is not a number", () => {
    const { unmount } = renderChart({ yourPay: 150_000 });
    expect(screen.getByTestId("marginal-rate-your-pay")).toBeDefined();
    unmount();
    for (const yourPay of [-1, Number.NaN]) {
      const view = renderChart({ yourPay });
      expect(screen.queryByTestId("marginal-rate-your-pay")).toBeNull();
      view.unmount();
    }
  });

  it("near-pay falls back to every threshold when your pay is past the axis", () => {
    renderChart({ thresholdFocus: "near-pay", yourPay: 200_000 });
    expect(screen.getAllByTestId("marginal-rate-threshold")).toHaveLength(6);
  });

  it("keeps the tooltip open on keys other than Escape", () => {
    renderChart();
    const marker = screen.getAllByTestId("marginal-rate-threshold-hit")[0] as HTMLElement;
    fireEvent.focus(marker);
    fireEvent.keyDown(marker, { key: "ArrowRight" });
    expect(screen.getByTestId("marginal-rate-tooltip")).toBeDefined();
  });

  it("keeps a focused marker's tooltip when the pointer leaves another marker", () => {
    renderChart();
    const [first, second] = screen.getAllByTestId("marginal-rate-threshold-hit") as HTMLElement[];
    if (!first || !second) throw new Error("needs two markers");
    fireEvent.mouseEnter(second);
    fireEvent.focus(first);
    fireEvent.mouseLeave(second);
    expect(screen.getByTestId("marginal-rate-tooltip").textContent).toContain("£12,570");
  });

  it("offers no data table when there are no rows", () => {
    renderChart({ dataTable: [] });
    expect(screen.queryByRole("button", { name: "Show data" })).toBeNull();
  });

  it("leaves out the thresholds note when no threshold is drawn", () => {
    renderChart({ thresholds: [] });
    expect(screen.queryByText(/Each dashed line marks a threshold/)).toBeNull();
  });

  it("draws a threshold at £0 and one at the top of the axis", () => {
    renderChart({
      steppedZones: [],
      thresholds: [
        { gross: 0, label: "From the start" },
        { gross: 150_000, label: "At the top" },
      ],
    });
    expect(hitNames()).toEqual([
      "From the start: £0 pay before tax",
      "At the top: £150,000 pay before tax",
    ]);
  });

  it("marks your pay at £0", () => {
    renderChart({ yourPay: 0 });
    expect(screen.getByTestId("marginal-rate-your-pay")).toBeDefined();
  });

  it("puts only the pay ticks on the pay axis line", () => {
    renderChart();
    // At the default 600px width the drawing is 280px tall and the pay ticks sit 8px above its foot.
    const onAxis = Array.from(document.querySelectorAll('svg text[y="272"]')).map(
      (t) => t.textContent,
    );
    expect(onAxis).toEqual(["£0", "£50k", "£100k", "£150k"]);
  });

  it("redraws at the new width when the container is resized", () => {
    let width = 640;
    let notify: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(fn: () => void) {
          notify = fn;
        }
        observe() {}
        disconnect() {}
      },
    );
    const observe = vi.spyOn(ResizeObserver.prototype, "observe");
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ width }) as DOMRect,
    );
    renderChart();
    const svg = () => screen.getByTestId("marginal-rate-chart").querySelector("svg") as SVGElement;
    expect(svg().getAttribute("width")).toBe("640");
    expect(observe).toHaveBeenCalled();
    width = 420;
    act(() => notify?.());
    expect(svg().getAttribute("width")).toBe("420");
  });
});
