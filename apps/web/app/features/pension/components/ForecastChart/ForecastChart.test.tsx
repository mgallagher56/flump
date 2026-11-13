import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { projectPension } from "../../forecast";
import { ForecastChart } from "./ForecastChart";

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

const result = projectPension({
  startingPot: 20000,
  salary: 50000,
  employeePercent: 5,
  employerPercent: 3,
  isSalarySacrifice: false,
  passEmployerNi: false,
  directMonthlyContrib: 50,
  extraMonthly: 0,
  growthRate: 5,
  horizonYears: 25,
  useQualifyingEarnings: false,
  adjustForInflation: false,
  includeStatePension: false,
});

describe("<ForecastChart />", () => {
  it("is a named figure with a text summary and the stated assumptions", () => {
    render(
      <ForecastChart adjustForInflation={false} growthRate={5} horizonYears={25} result={result} />,
    );
    const figure = screen.getByRole("figure", { name: "Pension pot projection" });
    expect(figure.textContent).toMatch(/Projected pension pot after 25 years: £[\d,]+/);
    expect(
      screen.getByText("Assumes 5% a year growth and a 4% drawdown; projection, not a forecast."),
    ).toBeDefined();
  });

  it("keeps the year-by-year table behind the show data drawer", () => {
    render(
      <ForecastChart adjustForInflation={false} growthRate={5} horizonYears={25} result={result} />,
    );
    expect(screen.getByRole("button", { name: /Show data/ })).toBeDefined();
  });

  it("states the inflation adjustment", () => {
    render(<ForecastChart adjustForInflation growthRate={5} horizonYears={25} result={result} />);
    expect(screen.getByText(/after 2.5% inflation/)).toBeDefined();
  });
});
