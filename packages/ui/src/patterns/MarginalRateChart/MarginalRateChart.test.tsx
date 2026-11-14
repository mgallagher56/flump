import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lineLabelSpot, MarginalRateChart } from "./MarginalRateChart";
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
    for (const tick of ["£0", "£50k", "£100k", "£150k", "0%", "25%", "50%", "75%", "100%"]) {
      expect(svgText).toContain(tick);
    }
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
});
