import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RunwayCalculator } from "./RunwayCalculator";

const outcome = () => within(screen.getByRole("region", { name: "Illustration results" }));
const headline = () => screen.getByText("Your runway").closest("[data-tone]") as HTMLElement;

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
    expect(outcome().getByText("1 yr 4 mos")).toBeDefined();
    expect(headline().textContent).toContain("1 yr 4 mos");

    // Toggle investment account OFF: a saved preference, so the headline moves too
    fireEvent.click(toggleInvestmentBtn);

    // Now pool is £10,000 / £1,500 monthly burn = 6.66 months -> 6 months
    expect(outcome().getByText("6 months")).toBeDefined();
    expect(headline().textContent).toContain("6 months");
  });

  it("renders non-primary income in Income you would keep and treats toggling it as a scenario", () => {
    const onSaveSettings = vi.fn();
    const onScenarioChange = vi.fn();
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
        onScenarioChange={onScenarioChange}
      />,
    );

    expect(screen.getByText("Freelance Writing")).toBeDefined();
    expect(screen.getByText("kept")).toBeDefined();

    const incomeToggleBtn = screen.getByRole("switch", {
      name: /Keep Freelance Writing income/i,
    });
    expect(incomeToggleBtn.getAttribute("aria-checked")).toBe("true");

    // With £300 kept income: burn £1,200, pool £25,000 -> 20.8 months -> 1 yr 8 mos
    expect(outcome().getByText("1 yr 8 mos")).toBeDefined();
    const savedHeadline = headline().textContent;
    expect(savedHeadline).toContain("1 yr 8 mos");

    // Toggle income OFF: the illustration moves, the headline does not
    fireEvent.click(incomeToggleBtn);

    expect(incomeToggleBtn.getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("excluded")).toBeDefined();
    expect(outcome().getByText("1 yr 4 mos")).toBeDefined();
    expect(headline().textContent).toBe(savedHeadline);
    expect(onScenarioChange).toHaveBeenCalledWith(
      expect.objectContaining({ keptIncome: expect.objectContaining({ "inc-1": false }) }),
    );
    expect(onSaveSettings).not.toHaveBeenCalled();
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
  });

  it("labels the account choice as a saved preference and the rest as an illustration", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
      />,
    );
    expect(screen.getByText("Saved preference")).toBeDefined();
    expect(screen.getByRole("region", { name: "Model a change to your budget" })).toBeDefined();
    expect(screen.getByText("Illustration, not saved")).toBeDefined();
  });

  it("saves only the account preference; scenario changes save nothing and send no request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const onSaveSettings = vi.fn();
    const onScenarioChange = vi.fn();
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
        onSaveSettings={onSaveSettings}
        onScenarioChange={onScenarioChange}
      />,
    );
    const savedHeadline = headline().textContent;

    fireEvent.change(screen.getByLabelText(/Severance or lump sum/i), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText(/Extra monthly spending cut/i), {
      target: { value: "250" },
    });
    expect(onScenarioChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ severanceLump: 5000, extraMonthlyCut: 250 }),
    );
    expect(headline().textContent).toBe(savedHeadline);
    expect(onSaveSettings).not.toHaveBeenCalled();
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Switching an account off is the saved preference.
    fireEvent.click(screen.getByRole("switch", { name: /Include Vanguard S&S ISA/i }));
    expect(onSaveSettings).toHaveBeenCalledWith({
      includedAccounts: expect.objectContaining({ "acc-3": false }),
    });
    const stored = JSON.parse(localStorage.getItem("flump_runway_calculator_settings") ?? "{}");
    expect(Object.keys(stored)).toEqual(["includedAccounts"]);
    fetchSpy.mockRestore();
  });

  it("starts from the scenario held by the container and resets it without touching saved choices", () => {
    const onScenarioChange = vi.fn();
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        scenario={{ keptIncome: {}, keptExpenses: {}, severanceLump: 6000, extraMonthlyCut: 0 }}
        onNavigateToForecast={vi.fn()}
        onScenarioChange={onScenarioChange}
      />,
    );
    // Pool £25,000 + £6,000 severance over £1,500 burn is 20.6 months.
    expect(outcome().getByText("1 yr 8 mos")).toBeDefined();
    expect(headline().textContent).toContain("1 yr 4 mos");

    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onScenarioChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ severanceLump: 0, extraMonthlyCut: 0 }),
    );
    expect(outcome().getByText("1 yr 4 mos")).toBeDefined();
  });
});
