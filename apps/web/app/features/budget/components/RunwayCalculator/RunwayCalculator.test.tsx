import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RunwayCalculator } from "./RunwayCalculator";

const outcome = () => within(screen.getByRole("region", { name: "Illustration results" }));
const headline = () =>
  screen.getByText("Your months of cover").closest("[data-tone]") as HTMLElement;

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

  it("headlines the engine's saved figure: current and savings cash over essentials", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
      />,
    );
    // £2,000 + £8,000 cash over £1,500 essentials = 6.7 months. Investments are not cash.
    expect(headline().querySelector('[data-figure="monthsOfCover"]')?.textContent).toBe(
      "6.7 months",
    );
    // An untouched illustration starts from the same figure.
    expect(outcome().getByText("6.7 months")).toBeDefined();
    // Pension and mortgage accounts are never offered.
    expect(screen.queryByText("Workplace Pension")).toBeNull();
    expect(screen.queryByText("Home Mortgage")).toBeNull();
  });

  it("uses the baseline the container passes, not a recomputation", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        baseline={{
          status: "known",
          provenance: "derived",
          value: {
            months: 9.9,
            liquidCash: 1,
            monthlyEssentials: 1,
            commitments: {
              essentialsExcludingDebt: 1,
              accountMinimums: 0,
              minimumsEstimated: false,
              budgetDebtPayments: 0,
              debtCommitment: 0,
              total: 1,
            },
          },
        }}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
      />,
    );
    expect(headline().textContent).toContain("9.9 months");
  });

  it("shows Not set when there is no essential spending", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={[]}
        onNavigateToForecast={vi.fn()}
      />,
    );
    // An unknown figure falls back from the hero card; it shows Not set, never 0 or infinity.
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
    expect(document.querySelector('[data-figure="monthsOfCover"]')).toBeNull();
  });

  it("switching investments on is an illustration: the headline does not move", () => {
    const onScenarioChange = vi.fn();
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
        onScenarioChange={onScenarioChange}
      />,
    );
    const savedHeadline = headline().textContent;
    const isa = screen.getByRole("switch", {
      name: /Include Vanguard S&S ISA in this illustration/i,
    });
    expect(isa.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(isa);
    // £25,000 over £1,500 = 16.7 months.
    expect(outcome().getByText("16.7 months")).toBeDefined();
    expect(headline().textContent).toBe(savedHeadline);
    expect(onScenarioChange).toHaveBeenCalledWith(
      expect.objectContaining({ includedAccounts: expect.objectContaining({ "acc-3": true }) }),
    );
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
  });

  it("starts other income excluded, and keeping it is an illustration", () => {
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
        onScenarioChange={onScenarioChange}
      />,
    );
    const toggle = screen.getByRole("switch", { name: /Keep Freelance Writing income/i });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    const savedHeadline = headline().textContent;
    fireEvent.click(toggle);
    // £10,000 over £1,200 = 8.3 months.
    expect(outcome().getByText("8.3 months")).toBeDefined();
    expect(headline().textContent).toBe(savedHeadline);
  });

  it("labels the calculator as an illustration that is not saved", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
      />,
    );
    expect(screen.getByRole("region", { name: "Model a change to your budget" })).toBeDefined();
    expect(screen.getByText("Illustration, not saved")).toBeDefined();
    expect(screen.queryByText(/Critical|Healthy|Caution/)).toBeNull();
  });

  it("scenario changes save nothing and send no request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const onScenarioChange = vi.fn();
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
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
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("starts from the scenario held by the container and resets it", () => {
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
    // £10,000 + £6,000 severance over £1,500 = 10.7 months.
    expect(outcome().getByText("10.7 months")).toBeDefined();
    expect(headline().textContent).toContain("6.7 months");

    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onScenarioChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ severanceLump: 0, extraMonthlyCut: 0 }),
    );
    expect(outcome().getByText("6.7 months")).toBeDefined();
  });

  it("adds debt minimums that are not budget lines, as the saved figure does", () => {
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={[
          ...mockAccounts,
          {
            id: "card",
            name: "Card",
            type: "Credit Card",
            balance: 2000,
            currency: "GBP",
            interestRate: 20,
            monthlyContribution: 100,
          } as never,
        ]}
        entries={mockEntries}
        onNavigateToForecast={vi.fn()}
      />,
    );
    // £10,000 over £1,500 + £100 = 6.3 months, in both the headline and the illustration.
    expect(headline().textContent).toContain("6.3 months");
    expect(outcome().getByText("6.3 months")).toBeDefined();
  });
});

describe("RunwayCalculator untouched illustration equals the saved figure", () => {
  it("counts a non-essential debt row and a custom category as the saved figure does", () => {
    const row = (id: string, category: string, amount: number, isEssential: boolean) => ({
      id,
      userId: "u",
      name: id,
      category,
      amount,
      frequency: "monthly" as const,
      isIncome: false,
      isPrimaryIncome: false,
      isEssential,
      notes: null,
      isDefault: false,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={[{ id: "s", name: "Saver", type: "Saving", balance: 6000, currency: "GBP" }]}
        entries={[
          row("rent", "housing", 900, true),
          row("card", "debt", 100, false),
          row("pets", "pets", 50, true),
        ]}
        onNavigateToForecast={vi.fn()}
      />,
    );
    // £6,000 over £1,050 = 5.7 months in both places; the debt and pets rows can be switched.
    expect(screen.getByText("Your months of cover").closest("[data-tone]")?.textContent).toContain(
      "5.7 months",
    );
    expect(
      within(screen.getByRole("region", { name: "Illustration results" })).getByText("5.7 months"),
    ).toBeDefined();
    expect(screen.getByRole("switch", { name: "Keep card expense" })).toBeDefined();
    expect(screen.getByRole("switch", { name: "Keep pets expense" })).toBeDefined();
  });
});
