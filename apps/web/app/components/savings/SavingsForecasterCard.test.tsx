import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  };
});

import SavingsForecasterCard from "./SavingsForecasterCard";

describe("SavingsForecasterCard", () => {
  it("renders forecaster controls and scenario options", () => {
    render(
      <SavingsForecasterCard
        monthlyContribution={200}
        portfolioInterestRate={4.75}
        startingBalance={10000}
      />,
    );

    expect(screen.getByText("Compound Interest Growth Forecaster")).toBeDefined();
    expect(screen.getByText("Interest Rate Scenario:")).toBeDefined();
    expect(screen.getByLabelText("Interest Rate Scenario:")).toBeDefined();
    expect(screen.getByLabelText("Horizon:")).toBeDefined();
    expect(screen.getByText("Starting Balance")).toBeDefined();
  });
});
