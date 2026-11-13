import { describe, expect, it } from "vitest";
import {
  chartBandProps,
  chartCursorProps,
  chartGridProps,
  chartLineProps,
  chartXAxisProps,
  chartYAxisProps,
} from "./chartProps";

describe("chartProps", () => {
  it("uses the quiet chart.grid token for the grid, with no vertical lines", () => {
    expect(chartGridProps.stroke).toBe("var(--colors-chart-grid)");
    expect(chartGridProps.vertical).toBe(false);
    expect(chartCursorProps.stroke).toBe("var(--colors-chart-grid)");
  });

  it("mutes axis text and removes tick lines", () => {
    expect(chartXAxisProps.tick.fill).toBe("var(--colors-text-muted)");
    expect(chartYAxisProps.tickLine).toBe(false);
    expect(chartXAxisProps.tickLine).toBe(false);
  });

  it("formats y ticks as compact en-GB currency", () => {
    expect(chartYAxisProps.tickFormatter(25000)).toBe("£25k");
    expect(chartYAxisProps.tickFormatter(0)).toBe("£0");
    expect(chartYAxisProps.tickFormatter(1_200_000)).toBe("£1.2m");
    expect(chartYAxisProps.tickFormatter(-3400)).toBe("-£3.4k");
  });

  it("draws series from chart tokens with a solid line by default", () => {
    const props = chartLineProps("wealth");
    expect(props.stroke).toBe("var(--colors-chart-wealth)");
    expect(props.strokeDasharray).toBeUndefined();
    expect(props.dot).toBe(false);
  });

  it("dashes projections", () => {
    expect(chartLineProps("projection", { projection: true }).strokeDasharray).toBe("6 6");
  });

  it("only animates when asked (feed it useChartAnimation)", () => {
    expect(chartLineProps("primary").isAnimationActive).toBe(false);
    expect(chartLineProps("primary", { animate: true }).isAnimationActive).toBe(true);
    expect(chartLineProps("primary", { animate: false }).isAnimationActive).toBe(false);
  });

  it("shades projections with chart.band", () => {
    expect(chartBandProps.fill).toBe("var(--colors-chart-band)");
  });
});
