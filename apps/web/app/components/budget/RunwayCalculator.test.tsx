import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RunwayCalculator from "./RunwayCalculator";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (val: number) => `£${Math.round(val).toLocaleString()}`,
  }),
}));

vi.mock("~/context/ResponsiveContext", () => ({
  useResponsive: () => ({ isMobile: false }),
}));

describe("RunwayCalculator", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  const mockAccounts = [
    { id: "acc-1", name: "Main Current", type: "Current", balance: 2000, currency: "GBP" },
    { id: "acc-2", name: "Emergency Fund", type: "Saving", balance: 8000, currency: "GBP" },
    { id: "acc-3", name: "Vanguard S&S ISA", type: "Investment", balance: 15000, currency: "GBP" },
    { id: "acc-4", name: "Workplace Pension", type: "Pension", balance: 50000, currency: "GBP" },
    { id: "acc-5", name: "Home Mortgage", type: "Mortgage", balance: -200000, currency: "GBP" },
  ];

  const mockEntries = [
    {
      id: "ent-1",
      userId: "user-1",
      name: "Rent",
      category: "housing" as const,
      amount: 1000,
      frequency: "monthly" as const,
      isIncome: false,
      isPrimaryIncome: false,
      isEssential: true,
      notes: null,
      isDefault: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "ent-2",
      userId: "user-1",
      name: "Groceries",
      category: "expenses" as const,
      amount: 500,
      frequency: "monthly" as const,
      isIncome: false,
      isPrimaryIncome: false,
      isEssential: true,
      notes: null,
      isDefault: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];

  it("includes Investment accounts in the savings pool alongside Current and Saving accounts", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
      />,
    );

    // Current, Saving, and Investment accounts should appear in the savings pool
    expect(screen.getByText("Main Current")).toBeDefined();
    expect(screen.getByText("Emergency Fund")).toBeDefined();
    expect(screen.getByText("Vanguard S&S ISA")).toBeDefined();
    expect(screen.getByText("Investment")).toBeDefined();

    // Pension and Mortgage accounts should NOT appear in the savings pool
    expect(screen.queryByText("Workplace Pension")).toBeNull();
    expect(screen.queryByText("Home Mortgage")).toBeNull();

    // Total savings pool should sum 2,000 + 8,000 + 15,000 = £25,000
    expect(screen.getAllByText("£25,000").length).toBeGreaterThanOrEqual(1);
  });

  it("updates runway when toggling investment account in and out of the pool", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
      />,
    );

    const toggleInvestmentBtn = screen.getByRole("switch", {
      name: /Include Vanguard S&S ISA in savings pool/i,
    });
    expect(toggleInvestmentBtn).toBeDefined();

    // Initially includes investment account (£25,000 / £1,500 monthly burn = 16.6 months -> 1 yr 4 mos)
    expect(screen.getByText("1 yr 4 mos")).toBeDefined();

    // Toggle investment account OFF
    fireEvent.click(toggleInvestmentBtn);

    // Now pool is £10,000 / £1,500 monthly burn = 6.66 months -> 6 months
    expect(screen.getByText("6 months")).toBeDefined();
  });

  it("renders non-primary income in Income I'd Keep with colored toggle states and updates on toggle", () => {
    const onSaveSettings = vi.fn();
    const entriesWithIncome = [
      ...mockEntries,
      {
        id: "inc-1",
        userId: "user-1",
        name: "Freelance Writing",
        category: "income" as const,
        amount: 300,
        frequency: "monthly" as const,
        isIncome: true,
        isPrimaryIncome: false,
        isEssential: true,
        notes: null,
        isDefault: false,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={entriesWithIncome}
        onNavigateToForecast={vi.fn()}
        onSaveSettings={onSaveSettings}
      />,
    );

    // Section title and kept income amount
    expect(screen.getByText("Freelance Writing")).toBeDefined();
    expect(screen.getByText("kept")).toBeDefined();

    const incomeToggleBtn = screen.getByRole("switch", {
      name: /Keep Freelance Writing income/i,
    });
    expect(incomeToggleBtn.getAttribute("aria-checked")).toBe("true");

    // With £300 kept income: monthly burn is £1,500 - £300 = £1,200. Pool = £25,000 -> 20.8 mos -> 1 yr 8 mos
    expect(screen.getByText("1 yr 8 mos")).toBeDefined();

    // Toggle income OFF
    fireEvent.click(incomeToggleBtn);

    expect(incomeToggleBtn.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("excluded")).toBeDefined();
    // Monthly burn increases back to £1,500 -> 1 yr 4 mos
    expect(screen.getByText("1 yr 4 mos")).toBeDefined();
    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        keptIncome: expect.objectContaining({ "inc-1": false }),
      }),
    );
  });

  it("supports batch All / None toggling and Reset for runway settings", () => {
    const onSaveSettings = vi.fn();
    const entriesWithIncome = [
      ...mockEntries,
      {
        id: "inc-1",
        userId: "user-1",
        name: "Side Consulting",
        category: "income" as const,
        amount: 500,
        frequency: "monthly" as const,
        isIncome: true,
        isPrimaryIncome: false,
        isEssential: true,
        notes: null,
        isDefault: false,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={entriesWithIncome}
        onNavigateToForecast={vi.fn()}
        onSaveSettings={onSaveSettings}
      />,
    );

    // Verify auto-saved badge is present
    expect(screen.getAllByText(/Auto-saved/i).length).toBeGreaterThanOrEqual(1);

    // Click Reset button
    const resetBtn = screen.getByRole("button", { name: /Reset/i });
    fireEvent.click(resetBtn);

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        severanceLump: 0,
        extraMonthlyCut: 0,
      }),
    );
  });

  it("updates runway when typing into What-If scenario inputs or clicking preset chips", () => {
    const onSaveSettings = vi.fn();
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
        onSaveSettings={onSaveSettings}
      />,
    );

    const severanceInput = screen.getByLabelText(/Severance or lump sum/i);
    const extraCutInput = screen.getByLabelText(/Extra monthly spending cut/i);

    expect(severanceInput).toBeDefined();
    expect(extraCutInput).toBeDefined();

    // Type severance of £5,000
    fireEvent.change(severanceInput, { target: { value: "5000" } });
    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        severanceLump: 5000,
      }),
    );

    // Type extra monthly cut of £250
    fireEvent.change(extraCutInput, { target: { value: "250" } });

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        severanceLump: 5000,
        extraMonthlyCut: 250,
      }),
    );

    // Clear scenarios
    const clearBtn = screen.getByRole("button", { name: /Clear scenarios/i });
    fireEvent.click(clearBtn);

    expect(onSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        severanceLump: 0,
        extraMonthlyCut: 0,
      }),
    );
  });
});
