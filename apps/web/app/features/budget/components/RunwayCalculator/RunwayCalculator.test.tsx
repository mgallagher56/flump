import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RunwayCalculator } from "./RunwayCalculator";

const results = () => within(screen.getByRole("region", { name: "Illustration results" }));
const outcomeFigure = () => screen.getByTestId("runway-outcome").textContent;
/** The supporting figure that follows a term in the results ("Money to draw on"). */
const supporting = (term: string) =>
  results().getByText(term).closest("div")?.querySelector("dd")?.textContent ?? "";
const openMoreOptions = () => fireEvent.click(screen.getByRole("button", { name: "More options" }));

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

  it("shows two inputs and one outcome figure before More options is opened", () => {
    render(<RunwayCalculator accountDetails={[]} accounts={mockAccounts} entries={mockEntries} />);
    expect(screen.getAllByRole("textbox").length).toBeLessThanOrEqual(2);
    expect(screen.getByLabelText("Redundancy pay or lump sum")).toBeDefined();
    expect(screen.getByLabelText("Spending you would cut each month")).toBeDefined();
    expect(screen.getAllByTestId("runway-outcome")).toHaveLength(1);
    expect(results().getByText("Months of cover")).toBeDefined();
    // The line-by-line switches wait behind "More options".
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
    const more = screen.getByRole("button", { name: "More options" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    // No bulk buttons, no progress bar, no link away to another page.
    expect(screen.queryByRole("button", { name: /Include all|Include none/ })).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByRole("button", { name: /savings page/i })).toBeNull();
  });

  it("starts from the saved figure: current and savings cash over essentials", () => {
    render(<RunwayCalculator accountDetails={[]} accounts={mockAccounts} entries={mockEntries} />);
    // £2,000 + £8,000 cash over £1,500 essentials = 6.7 months. Investments are not cash.
    expect(outcomeFigure()).toBe("6.7 months");
    expect(supporting("Money to draw on")).toBe("£10,000");
    // One supporting figure: the essential spending line is gone, and the zone has no basis line.
    expect(results().queryByText("Essential spending to cover each month")).toBeNull();
    expect(screen.queryByText(/Starting from your/)).toBeNull();
    // Pension and mortgage accounts are never offered.
    openMoreOptions();
    expect(screen.getByRole("switch", { name: "Main Current" })).toBeDefined();
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
            months: 6.3,
            liquidCash: 10000,
            monthlyEssentials: 1600,
            commitments: {
              essentialsExcludingDebt: 1500,
              accountMinimums: 100,
              minimumsEstimated: false,
              budgetDebtPayments: 0,
              debtCommitment: 100,
              total: 1600,
            },
          },
        }}
        entries={mockEntries}
      />,
    );
    // The passed baseline's £100 of debt minimums outside the budget is counted: £10,000 over
    // £1,600 = 6.3 months. A recomputation from these props would have no debt and give 6.7.
    expect(outcomeFigure()).toBe("6.3 months");
  });

  it("shows Not set when there is no essential spending", () => {
    render(<RunwayCalculator accountDetails={[]} accounts={mockAccounts} entries={[]} />);
    // An unknown figure is never shown as 0 months.
    expect(outcomeFigure()).toBe("Not set");
    expect(document.querySelector('[data-figure="monthsOfCover"]')).toBeNull();
  });

  it("switching investments on is an illustration: nothing is saved", () => {
    const onScenarioChange = vi.fn();
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={mockAccounts}
        entries={mockEntries}
        onScenarioChange={onScenarioChange}
      />,
    );
    openMoreOptions();
    const isa = screen.getByRole("switch", { name: "Vanguard S&S ISA" }) as HTMLInputElement;
    expect(isa.checked).toBe(false);
    fireEvent.click(isa);
    expect(isa.checked).toBe(true);
    // £25,000 over £1,500 = 16.7 months.
    expect(outcomeFigure()).toBe("16.7 months");
    expect(supporting("Money to draw on")).toBe("£25,000");
    expect(onScenarioChange).toHaveBeenCalledWith(
      expect.objectContaining({ includedAccounts: expect.objectContaining({ "acc-3": true }) }),
    );
    expect(localStorage.getItem("flump_runway_calculator_settings")).toBeNull();
  });

  it("starts other income excluded, and keeping it is an illustration", () => {
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
      <RunwayCalculator accountDetails={[]} accounts={mockAccounts} entries={entriesWithIncome} />,
    );
    // Other income starts excluded, so the untouched illustration matches the saved figure.
    expect(outcomeFigure()).toBe("6.7 months");
    openMoreOptions();
    const toggle = screen.getByRole("switch", { name: "Freelance Writing" }) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    fireEvent.click(toggle);
    // £10,000 over £1,200 = 8.3 months.
    expect(outcomeFigure()).toBe("8.3 months");
  });

  it("labels the calculator as an illustration that is not saved", () => {
    render(<RunwayCalculator accountDetails={[]} accounts={mockAccounts} entries={mockEntries} />);
    expect(screen.getByRole("region", { name: "Model a change to your budget" })).toBeDefined();
    expect(screen.getByText("Illustration, not saved")).toBeDefined();
    // The page's one notice sits in the zone footer, and no hero is drawn in the zone.
    expect(document.querySelectorAll('[data-notice="projection"]')).toHaveLength(1);
    expect(document.querySelector('[data-tone="hero"]')).toBeNull();
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
        onScenarioChange={onScenarioChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Redundancy pay or lump sum/i), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText(/Spending you would cut each month/i), {
      target: { value: "250" },
    });
    expect(onScenarioChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ severanceLump: 5000, extraMonthlyCut: 250 }),
    );
    // £15,000 over £1,250 = 12 months.
    expect(supporting("Money to draw on")).toBe("£15,000");
    expect(outcomeFigure()).toBe("12 months");
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
        onScenarioChange={onScenarioChange}
      />,
    );
    // £10,000 + £6,000 severance over £1,500 = 10.7 months.
    expect(outcomeFigure()).toBe("10.7 months");
    expect(supporting("Money to draw on")).toBe("£16,000");

    fireEvent.click(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onScenarioChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ severanceLump: 0, extraMonthlyCut: 0 }),
    );
    expect(outcomeFigure()).toBe("6.7 months");
    expect(supporting("Money to draw on")).toBe("£10,000");
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
      />,
    );
    // £10,000 over £1,500 + £100 = 6.3 months, the same as the saved figure.
    expect(outcomeFigure()).toBe("6.3 months");
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
      />,
    );
    // £6,000 over £1,050 = 5.7 months; the debt and pets rows are counted and can be switched.
    expect(outcomeFigure()).toBe("5.7 months");
    openMoreOptions();
    const card = screen.getByRole("switch", { name: "card" }) as HTMLInputElement;
    const pets = screen.getByRole("switch", { name: "pets" }) as HTMLInputElement;
    expect(card.checked).toBe(true);
    expect(pets.checked).toBe(true);
    fireEvent.click(pets);
    // £6,000 over £1,000 = 6 months.
    expect(outcomeFigure()).toBe("6 months");
  });
});
