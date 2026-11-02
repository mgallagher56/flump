import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

import PensionSummaryCards from "./PensionSummaryCards";

describe("PensionSummaryCards", () => {
  it("renders metric cards accurately with UK auto-enrolment defaults and tax relief", () => {
    render(
      <PensionSummaryCards
        directMonthlyContrib={50}
        employeePercent={5.0}
        employerPercent={3.0}
        monthlyEmployeeContrib={188}
        monthlyEmployerContrib={113}
        netMonthlyCost={135}
        potsCount={2}
        taxReliefMonthly={53}
        totalValue={25000}
        weightedReturnRate={5.4}
      />,
    );

    expect(screen.getByText("Total Pension Wealth")).toBeDefined();
    expect(screen.getByText("£25,000")).toBeDefined();
    expect(screen.getByText(/Across 2 pension pots/i)).toBeDefined();
    expect(screen.getByText(/5\.4% avg return/i)).toBeDefined();
    expect(screen.getByText("Total Monthly Inflow")).toBeDefined();
    expect(screen.getByText("£351")).toBeDefined();
    expect(screen.getByText("Employee (5.0%)")).toBeDefined();
    expect(screen.getByText(/Net cost: £135\/mo \(£53 tax relief\)/i)).toBeDefined();
    expect(screen.getByText("Employer (3.0%)")).toBeDefined();
  });
});
