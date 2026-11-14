import { countFigures } from "@repo/ui/testing";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { projectPension } from "../../forecast";
import { evenYearTicks, ForecastChart } from "./ForecastChart";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`,
  }),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

const result = (horizonYears: number) =>
  projectPension({
    startingPot: 20000,
    salary: 50000,
    employeePercent: 5,
    employerPercent: 3,
    isSalarySacrifice: false,
    passEmployerNi: false,
    directMonthlyContrib: 50,
    extraMonthly: 0,
    growthRate: 5,
    horizonYears,
    useQualifyingEarnings: false,
    adjustForInflation: true,
    includeStatePension: false,
  });

const renderChart = (horizonYears = 25) =>
  render(
    <ForecastChart adjustForInflation annotationLabel="Retirement" result={result(horizonYears)} />,
  );

describe("<ForecastChart />", () => {
  it("is a named figure with a one-sentence summary and no figures in the default view", () => {
    const { container } = renderChart();
    const figure = screen.getByRole("figure", { name: "Estimated pension pot" });
    expect(figure.textContent).toContain("Your pot each year to retirement, in today's money.");
    expect(screen.queryByText(/legend|Projected total/i)).toBeNull();
    expect(countFigures(container)).toBe(0);
  });

  it("keeps the year-by-year table behind the quiet show data button", () => {
    renderChart();
    expect(screen.getByRole("button", { name: /Show data/ })).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("uses even year steps that end on the retirement year, six ticks at most", () => {
    const years = Array.from({ length: 33 }, (_, i) => 2026 + i);
    expect(evenYearTicks(years)).toEqual([2028, 2038, 2048, 2058]);
    expect(evenYearTicks(years.slice(0, 11))).toEqual([2026, 2031, 2036]);
  });

  it("draws no chart for fewer than three points", () => {
    renderChart(1);
    expect(screen.getByText(/not enough figures/i)).toBeDefined();
  });
});
