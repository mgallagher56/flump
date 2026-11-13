import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { projectPension } from "../../forecast";
import { ForecasterResults } from "./ForecasterResults";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`,
  }),
}));

const input = {
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
};

describe("<ForecasterResults />", () => {
  it("shows the projected pot and income without the hero tone", () => {
    const result = projectPension(input);
    const { container } = render(
      <ForecasterResults directMonthlyContrib={50} horizonYears={25} result={result} />,
    );
    expect(screen.getByText("Projected pot in 25 years")).toBeDefined();
    expect(screen.getByText("Estimated income")).toBeDefined();
    expect(screen.getByText("Your contributions")).toBeDefined();
    expect(container.querySelectorAll("[data-tone='hero']")).toHaveLength(0);
    expect(screen.getByTestId("pension-estimate-note").textContent).toMatch(/4% yearly drawdown/);
    expect(screen.getByText(/UK Retirement Living Standards/)).toBeDefined();
  });

  it("warns when payments go over the annual allowance", () => {
    const result = projectPension({ ...input, extraMonthly: 5000 });
    render(<ForecasterResults directMonthlyContrib={50} horizonYears={25} result={result} />);
    expect(screen.getByText("Above the annual allowance")).toBeDefined();
  });
});
