import { expectPageRules } from "@repo/ui/testing";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { type ForecastInput, projectPension } from "../../forecast";
import { ForecasterResults } from "./ForecasterResults";

const input: ForecastInput = {
  startingPot: 96000,
  salary: 58000,
  employeePercent: 8,
  employerPercent: 3,
  isSalarySacrifice: false,
  passEmployerNi: false,
  directMonthlyContrib: 0,
  extraMonthly: 0,
  growthRate: 5,
  horizonYears: 32,
  useQualifyingEarnings: false,
  adjustForInflation: true,
  includeStatePension: false,
};

describe("<ForecasterResults />", () => {
  it("shows one outcome and two supporting figures, with no change at the saved figures", () => {
    const saved = projectPension(input);
    const { container } = render(
      <ForecasterResults inTodaysMoney result={saved} savedResult={saved} whenLabel="at 67" />,
    );
    expect(screen.getByText("Estimated income at retirement")).toBeDefined();
    expect(screen.getByText("Pot at 67")).toBeDefined();
    expect(screen.getByText("No change")).toBeDefined();
    expect(screen.queryByText(/PLSA|standard/i)).toBeNull();
    expectPageRules(container, { maxFigures: 2 });
  });

  it("states the change against the saved figures", () => {
    const saved = projectPension(input);
    const more = projectPension({ ...input, employeePercent: 12 });
    render(<ForecasterResults inTodaysMoney result={more} savedResult={saved} whenLabel="at 67" />);
    const change = screen.getByText("Against your saved figures").nextElementSibling;
    expect(change?.textContent).toMatch(/^\+£[\d,]+ a month$/);
  });

  it("notes the annual allowance in a neutral style only when the illustration is above it", () => {
    const big = projectPension({ ...input, salary: 300000, employeePercent: 30 });
    render(<ForecasterResults inTodaysMoney result={big} savedResult={big} whenLabel="at 67" />);
    expect(screen.getByText("Above the annual allowance")).toBeDefined();
  });
});
