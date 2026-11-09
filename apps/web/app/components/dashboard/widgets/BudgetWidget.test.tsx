import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetWidget } from "./BudgetWidget";

vi.mock("react-router", () => ({
  Link: ({ children, to, className }: any) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (amount: number) => `£${amount.toLocaleString()}`,
  }),
}));

describe("BudgetWidget Runway Display", () => {
  const baseData = {
    monthlyIncome: 6680,
    annualSalary: 100000,
    monthlyExpenses: 4950,
    monthlySurplus: 1730,
    budgetedSavings: 1200,
    livingExpenses: 3750,
    savingsRatePct: 44,
  };

  const renderBudgetWidget = (data: any) =>
    render(<BudgetWidget data={data} editMode={false} size="normal" />);

  it("shows years/months instead of descriptive labels like 'Ironclad Runway'", () => {
    renderBudgetWidget({
      ...baseData,
      runwayMonths: 12.0,
      runwayLabel: "Ironclad Runway",
    });

    // Should NOT show "Ironclad Runway"
    expect(screen.queryByText("Ironclad Runway")).toBeNull();
    // Should show "1 yr"
    expect(screen.getByText("1 yr")).toBeDefined();
    expect(screen.getByText("Runway:")).toBeDefined();
  });

  it("shows decimal months for sub-year durations (e.g. 7.5 mos and 0.7 mos)", () => {
    const { rerender } = renderBudgetWidget({
      ...baseData,
      runwayMonths: 7.5,
      runwayLabel: "Healthy Runway",
    });

    expect(screen.queryByText("Healthy Runway")).toBeNull();
    expect(screen.getByText("7.5 mos")).toBeDefined();

    rerender(
      <BudgetWidget
        data={{
          ...baseData,
          runwayMonths: 0.7,
          runwayLabel: "Critical Runway",
        }}
        editMode={false}
        size="normal"
      />,
    );

    expect(screen.queryByText("Critical Runway")).toBeNull();
    expect(screen.getByText("0.7 mos")).toBeDefined();
  });

  it("formats compound years and months correctly (e.g. 18 months -> '1 yr 6 mos')", () => {
    renderBudgetWidget({
      ...baseData,
      runwayMonths: 18,
    });

    expect(screen.getByText("1 yr 6 mos")).toBeDefined();
  });

  it("formats multiple whole years (e.g. 24 months -> '2 yrs')", () => {
    renderBudgetWidget({
      ...baseData,
      runwayMonths: 24,
    });

    expect(screen.getByText("2 yrs")).toBeDefined();
  });

  it("rejects purely descriptive runway labels when runwayMonths is not provided", () => {
    renderBudgetWidget({
      ...baseData,
      runwayMonths: null,
      runwayLabel: "Ironclad Runway",
    });

    expect(screen.queryByText("Ironclad Runway")).toBeNull();
    expect(screen.getByText("Not set")).toBeDefined();
  });
});
