import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SavingsSummaryCards } from "./SavingsSummaryCards";

describe("SavingsSummaryCards", () => {
  it("shows the total in the hero and four figures under Where you stand", () => {
    render(
      <SavingsSummaryCards
        accountCount={3}
        monthlyTakeHome={3500}
        projectedTenYearBalance={45000}
        totalMonthlySavings={350}
        totalSavingsBalance={12000}
        weightedInterestRate={5.2}
      />,
    );

    expect(screen.getByText("Total savings")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Where you stand" })).toBeDefined();
    expect(screen.getByText("Saved each month")).toBeDefined();
    expect(screen.getByText("Average interest rate")).toBeDefined();
    expect(screen.getByText("Interest in a year")).toBeDefined();
    expect(screen.getByText("Projected in 10 years")).toBeDefined();
    expect(screen.getByText(/£12,000/)).toBeDefined();
    expect(screen.getByText(/5\.20/)).toBeDefined();
    expect(screen.getByText(/£45,000/)).toBeDefined();
    expect(screen.getByText(/of your take-home pay/)).toBeDefined();
  });

  it("falls back to a plain line when take-home pay is unknown", () => {
    render(
      <SavingsSummaryCards
        accountCount={1}
        projectedTenYearBalance={0}
        totalMonthlySavings={0}
        totalSavingsBalance={0}
        weightedInterestRate={0}
      />,
    );
    expect(screen.getByText("Regular saving across your accounts")).toBeDefined();
    expect(screen.getByText("Across 1 savings or investment account")).toBeDefined();
  });
});
