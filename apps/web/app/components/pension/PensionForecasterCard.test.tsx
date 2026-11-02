import { fireEvent, render, screen } from "@testing-library/react";
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

import PensionForecasterCard from "./PensionForecasterCard";

describe("PensionForecasterCard", () => {
  it("renders forecaster controls, UK retirement toggles, and PLSA benchmark correctly", () => {
    render(
      <PensionForecasterCard
        currentPotTotal={20000}
        directMonthlyContrib={50}
        initialEmployeePercent={5.0}
        initialEmployerPercent={3.0}
        initialSalary={50000}
        portfolioReturnRate={5.5}
      />,
    );

    expect(screen.getByText("Pension Growth & Retirement Forecaster")).toBeDefined();
    expect(screen.getByText("Annual Salary")).toBeDefined();
    expect(screen.getByText("Employee Contrib")).toBeDefined();
    expect(screen.getByText("Employer Contrib")).toBeDefined();
    expect(screen.getByText("Horizon to Retirement")).toBeDefined();
    expect(screen.getByText("Expected Annual Growth Rate (p.a.)")).toBeDefined();
    expect(screen.getByText(/PROJECTED POT/i)).toBeDefined();
    expect(screen.getByText(/EST. RETIREMENT INCOME/i)).toBeDefined();
    expect(screen.getByText(/UK Qualifying Earnings/i)).toBeDefined();
    expect(screen.getByText(/Adjust for Inflation/i)).toBeDefined();
    expect(screen.getByText(/Include UK State Pension/i)).toBeDefined();
    expect(screen.getByText(/Salary Sacrifice/i)).toBeDefined();
    expect(screen.getByText(/Pass on Employer NI/i)).toBeDefined();
    expect(screen.getByText(/UK Retirement Living Standard Benchmark/i)).toBeDefined();
  });

  it("toggles employer NI pass-through and calls onSyncToProfile", () => {
    const onSync = vi.fn();
    render(
      <PensionForecasterCard
        currentPotTotal={20000}
        initialEmployeePercent={5.0}
        initialEmployerPercent={3.0}
        initialSalary={50000}
        onSyncToProfile={onSync}
      />,
    );

    const employerNiBtn = screen.getByRole("button", { name: /Pass on Employer NI/i });
    expect(employerNiBtn).toBeDefined();
    fireEvent.click(employerNiBtn);

    const syncBtn = screen.getByRole("button", { name: /Sync Rates to Profile/i });
    fireEvent.click(syncBtn);
    expect(onSync).toHaveBeenCalledWith(5.0, 3.0, 50000, true, true);
  });

  it("shows UK £100k tax trap detector when salary is in the taper zone", () => {
    render(
      <PensionForecasterCard
        currentPotTotal={50000}
        initialEmployeePercent={5.0}
        initialEmployerPercent={3.0}
        initialSalary={115000}
      />,
    );

    expect(screen.getByText(/UK £100k Tax Trap Detected:/i)).toBeDefined();
    const applyBtn = screen.getByRole("button", { name: /Apply 13\.5%/i });
    expect(applyBtn).toBeDefined();
    fireEvent.click(applyBtn);
    expect(screen.getByText(/13\.5%/i)).toBeDefined();
  });
});
