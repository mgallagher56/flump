import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

import SavingsSummaryCards from "./SavingsSummaryCards";

describe("SavingsSummaryCards", () => {
  it("renders metric cards accurately", () => {
    render(
      <SavingsSummaryCards
        accountCount={3}
        allocationMode="per_account"
        projectedTenYearBalance={45000}
        totalMonthlySavings={350}
        totalSavingsBalance={12000}
        weightedInterestRate={5.2}
      />,
    );

    expect(screen.getByText("Total Savings Balance")).toBeDefined();
    expect(screen.getByText("Monthly Savings")).toBeDefined();
    expect(screen.getByText("Portfolio Weighted APY")).toBeDefined();
    expect(screen.getByText("10-Year Growth")).toBeDefined();
    expect(screen.getByText("5.20%")).toBeDefined();
  });
});
