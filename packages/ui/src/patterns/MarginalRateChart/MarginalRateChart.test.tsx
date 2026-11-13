import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarginalRateChart } from "./MarginalRateChart";
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
      title="Estimated share deducted from the next £1,000, by gross pay"
      yourPay={39_000}
      {...props}
    />,
  );

describe("MarginalRateChart", () => {
  it("is a named figure with the caller's summary", () => {
    renderChart();
    expect(
      screen.getByRole("figure", {
        name: "Estimated share deducted from the next £1,000, by gross pay",
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
    expect(names).toContain("Income Tax starts; National Insurance starts: £12,570 gross pay");
    expect(names).toContain("Personal Allowance starts to reduce: £100,000 gross pay");
  });

  it("marks your pay and the stepped zone", () => {
    renderChart();
    const you = screen.getByTestId("marginal-rate-your-pay");
    expect(you.textContent).toContain("Your pay");
    expect(you.querySelector("title")?.textContent).toBe("Your pay: £39,000");
    expect(screen.getAllByTestId("marginal-rate-stepped-zone")).toHaveLength(1);
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
      "Higher rate (40%); National Insurance upper limit: £50,270 gross pay",
    );
    fireEvent.mouseLeave(marker);
    expect(screen.queryByTestId("marginal-rate-tooltip")).toBeNull();
  });

  it("shows the tooltip on keyboard focus, closes it on Escape and on blur", () => {
    renderChart();
    const marker = screen.getAllByTestId("marginal-rate-threshold-hit")[0] as HTMLElement;
    expect(marker.getAttribute("aria-label")).toBe(
      "Income Tax starts; National Insurance starts: £12,570 gross pay",
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
        title="Estimated share deducted from the next £1,000, by gross pay"
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
    expect(screen.getByRole("columnheader", { name: "Gross pay" })).toBeDefined();
    expect(
      screen.getByRole("columnheader", { name: "Estimated share deducted from the next £1,000" }),
    ).toBeDefined();
    expect(screen.getByRole("rowheader", { name: "£50,000" })).toBeDefined();
  });
});
