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
  it("shows one rounded outcome and the lump sum, hiding the change line at the saved figures", () => {
    const saved = projectPension(input);
    const { container } = render(
      <ForecasterResults
        inTodaysMoney
        result={saved}
        savedResult={saved}
        whenLabel="at retirement"
      />,
    );
    expect(screen.getByText("Estimated pot at retirement")).toBeDefined();
    expect(screen.getByText("Tax-free lump sum")).toBeDefined();
    // The saved monthly income is the page's KPI: the outcome never repeats it.
    expect(document.body.textContent).not.toContain("a month");
    expect(screen.queryByText("Change in monthly income")).toBeNull();
    expect(screen.queryByText("No change")).toBeNull();
    const value =
      screen.getByText("Estimated pot at retirement").nextElementSibling?.textContent ?? "";
    expect(value).toMatch(/^About £[\d,]+$/);
    expect(Number(value.replace(/\D/g, "")) % 100).toBe(0);
    expect(screen.queryByText(/PLSA|standard/i)).toBeNull();
    expectPageRules(container, { maxFigures: 2 });
  });

  it("states the change against the saved figures", () => {
    const saved = projectPension(input);
    const more = projectPension({ ...input, employeePercent: 12 });
    render(
      <ForecasterResults
        inTodaysMoney
        result={more}
        savedResult={saved}
        whenLabel="at retirement"
      />,
    );
    const change = screen.getByText("Change in monthly income").nextElementSibling;
    expect(change?.textContent).toMatch(/^\+£[\d,]+ a month$/);
  });

  it("notes the annual allowance in a neutral style only when the illustration is above it", () => {
    const big = projectPension({ ...input, salary: 300000, employeePercent: 30 });
    render(
      <ForecasterResults inTodaysMoney result={big} savedResult={big} whenLabel="at retirement" />,
    );
    expect(screen.getByText("Above the annual allowance")).toBeDefined();
  });
});
