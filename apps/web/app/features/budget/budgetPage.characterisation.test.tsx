import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BudgetEntry } from "~/types/budget";
import { buildWorkspacePicture } from "~/utils/financialPicture";
import { BreathingRoomBasis } from "./components/BreathingRoomBasis";
import { rankCategories } from "./components/BudgetCategoryList";
import { BudgetOverview } from "./components/BudgetOverview";
import { RunwayCalculator } from "./components/RunwayCalculator";
import { isIncomeEntry } from "./income";
import { linkedAccountFor, linkedSourceText, pageBudgetEntries } from "./linkedEntries";

/**
 * The Budget page's figures and rules as web works them out today, pinned before they move into
 * the engine (E12 S10, the S5 method). Written and run against web's own code first; after the
 * move only the import lines may change, never an expected value. Every expected value is worked
 * out by hand, with the working beside it.
 */

let seq = 0;
const entry = (overrides: Partial<BudgetEntry>): BudgetEntry => {
  seq += 1;
  return {
    id: `e${seq}`,
    userId: "u1",
    category: "expenses",
    name: "Entry",
    amount: 100,
    frequency: "monthly",
    isEssential: false,
    isIncome: false,
    isPrimaryIncome: false,
    isDefault: false,
    notes: null,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  };
};

const SALARY = entry({
  id: "salary",
  category: "income",
  name: "Salary",
  amount: 3000,
  isIncome: true,
});
const RENT = entry({
  id: "rent",
  category: "housing",
  name: "Rent",
  amount: 1000,
  isEssential: true,
});
const DINING = entry({ id: "dining", category: "expenses", name: "Dining", amount: 500 });
const ISA = entry({ id: "isa", category: "savings", name: "ISA", amount: 200 });

const EMPLOYEE = {
  annualSalary: 36000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
};

afterEach(() => {
  vi.useRealTimers();
});

function overview(entries: BudgetEntry[], userProfile?: unknown) {
  const picture = buildWorkspacePicture({ budgetEntries: entries, userProfile });
  const view = render(<BudgetOverview entries={entries} picture={picture} />);
  const hero = view.container.querySelector('[data-figure="budget.surplus"]');
  const safe = view.container.querySelector('[data-figure="safeToSpend.monthly"]');
  return {
    text: view.container.textContent ?? "",
    hero: hero?.textContent ?? null,
    sign: hero?.getAttribute("data-figure-sign") ?? null,
    safe: safe?.textContent ?? null,
    equation: screen.queryByTestId("budget-equation") !== null,
  };
}

describe("the budget overview (characterisation)", () => {
  it("left over: money in less bills, spending and savings", () => {
    // 3,000 - 1,000 - 500 - 200 = 1,300 left over. Going out 1,000 + 500 + 200 = 1,700.
    // Safe to spend: 3,000 - (essentials 1,000 + savings 200) - debt 0 = 1,800 a month.
    const o = overview([SALARY, RENT, DINING, ISA]);
    expect(o.text).toContain("Left over each month");
    expect(o.hero).toBe("£1,300");
    expect(o.sign).toBe("1");
    expect(o.text).toContain("£3,000");
    expect(o.text).toContain("£1,700");
    expect(o.safe).toBe("£1,800");
    expect(o.equation).toBe(true);
  });

  it("short: the hero says short and shows the gap as a positive figure", () => {
    // 1,500 - 1,700 = -200: short by 200. Safe to spend 1,500 - 1,200 = 300.
    const o = overview([{ ...SALARY, amount: 1500 }, RENT, DINING, ISA]);
    expect(o.text).toContain("Short each month");
    expect(o.hero).toBe("£200");
    expect(o.sign).toBe("-1");
    expect(o.safe).toBe("£300");
    expect(o.text).toContain("Short");
  });

  it("income only: left over is the whole income, going out is £0, and essentials are asked for", () => {
    // 3,000 - 0 = 3,000. No essential row, so safe to spend is unknown for want of essentials.
    const o = overview([SALARY]);
    expect(o.hero).toBe("£3,000");
    expect(o.text).toContain("£0");
    expect(o.safe).toBeNull();
    expect(o.text).toContain(
      "Add your essential spending to see what you have after it each month.",
    );
  });

  it("no income: no hero figure, going out still shown", () => {
    // No income row: income and left over are unknown; going out is the rent, 1,000.
    const o = overview([RENT]);
    expect(o.hero).toBeNull();
    expect(o.text).toContain("Add your income to see what is left over each month.");
    expect(o.text).toContain("£1,000");
    expect(o.equation).toBe(true);
  });

  it("take-home not set: a linked pay line with no salary says so, never £0", () => {
    const linked = entry({
      category: "income",
      name: "Pay",
      amount: 0,
      isIncome: true,
      linkKind: "take_home",
    });
    const o = overview([linked, RENT]);
    expect(o.hero).toBeNull();
    expect(o.text).toContain("Your take-home pay is not set, so what is left over is unknown.");
    expect(o.equation).toBe(false);
  });

  it("refused: Scotland in 2027/28 has no published rates, so the notice stands in", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-06-01T12:00:00Z"));
    const linked = entry({
      category: "income",
      name: "Pay",
      amount: 0,
      isIncome: true,
      linkKind: "take_home",
    });
    const o = overview([linked, RENT], { ...EMPLOYEE, taxRegion: "SCOTLAND" });
    expect(o.hero).toBeNull();
    expect(o.text).toContain(
      "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
    );
    expect(o.text).not.toContain("Your take-home pay is not set");
  });

  it("housing not set: a linked housing line with no saved payment says so", () => {
    const housing = entry({
      category: "housing",
      name: "Rent",
      amount: 0,
      isEssential: true,
      linkKind: "housing",
    });
    const o = overview([SALARY, housing]);
    expect(o.hero).toBeNull();
    expect(o.text).toContain("Your housing payment is not set, so what is left over is unknown.");
  });

  it("a linked take-home with a refused student loan plan says what it leaves out", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-06-01T12:00:00Z"));
    // Take-home 2,333 (36,000 employee, 5% pension; Plan 1 has no 2027/28 threshold so is left
    // out): 2,333 - 1,000 - 500 - 200 = 633 left over.
    const linked = entry({
      category: "income",
      name: "Pay",
      amount: 0,
      isIncome: true,
      linkKind: "take_home",
    });
    const o = overview([linked, RENT, DINING, ISA], { ...EMPLOYEE, studentLoanPlans: ["PLAN_1"] });
    expect(o.hero).toBe("£633");
    expect(o.text).toContain(
      "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.",
    );
  });
});

describe("where your money goes (characterisation)", () => {
  it("ranks by monthly amount, counts weekly, annual and joint rows at their monthly share", () => {
    const rows = rankCategories(
      ["housing", "bills", "expenses", "savings", "income"],
      [
        SALARY,
        // 100 a week: 100 x 52 / 12 = 433.333...
        entry({ category: "expenses", amount: 100, frequency: "weekly" }),
        // 1,200 a year: 1,200 / 12 = 100.
        entry({ category: "bills", amount: 1200, frequency: "annual" }),
        // Joint 900 at 40%: 360. Plus a sole 40: housing 400.
        entry({ category: "housing", amount: 900, ownership: "joint", sharePercent: 40 }),
        entry({ category: "housing", amount: 40 }),
        // Savings 400 exactly: ties with housing, and savings comes after housing in the list.
        entry({ category: "savings", amount: 400 }),
        // A £0 suggestion: its category has no amount, so it is left out.
        entry({ category: "gym", amount: 0 }),
        // 0.4 rounds to 0: left out too.
        entry({ category: "tips", amount: 0.4 }),
      ],
    );
    expect(
      rows.map((r) => [r.category, Math.round(r.total * 100) / 100, r.count, r.notSet]),
    ).toEqual([
      ["expenses", 433.33, 1, false],
      ["housing", 400, 2, false],
      ["savings", 400, 1, false],
      ["bills", 100, 1, false],
    ]);
  });

  it("keeps a category with a not-set line, and never counts the line as £0 in a total", () => {
    const rows = rankCategories(
      ["housing"],
      [entry({ category: "housing", amount: 0, linked: "housing", notSet: true })],
    );
    expect(rows).toEqual([
      { category: "housing", label: "Housing", total: 0, count: 1, notSet: true },
    ]);
  });

  it("leaves out income categories, and an entry in 'income' is income whatever its flag", () => {
    expect(isIncomeEntry({ isIncome: false, category: "income" })).toBe(true);
    expect(isIncomeEntry({ isIncome: true, category: "bills" })).toBe(true);
    expect(isIncomeEntry({ isIncome: false, category: "bills" })).toBe(false);
    // A custom category holding only an income row is left out; a stray spending row keeps it.
    const rows = rankCategories(
      ["side"],
      [
        entry({ category: "side", amount: 300, isIncome: true }),
        entry({ category: "pets", amount: 30 }),
      ],
    );
    expect(rows.map((r) => r.category)).toEqual(["pets"]);
  });
});

describe("the page's rows and the linked source line (characterisation)", () => {
  const accounts = [
    { id: "isa", name: "Stocks ISA", type: "Investment", balance: 9000, monthlyContribution: 300 },
    { id: "loan", name: "Car loan", type: "Loan", balance: -5000, monthlyContribution: null },
    { id: "cur", name: "Current", type: "Current", balance: 1200 },
  ];
  const savingsLine = entry({
    id: "isa-line",
    category: "savings",
    name: "ISA saving",
    amount: 0,
    linkKind: "savings",
    linkAccountId: "isa",
  });
  const debtLine = entry({
    id: "loan-line",
    category: "debt",
    name: "Car loan payment",
    amount: 0,
    isEssential: true,
    linkKind: "debt",
    linkAccountId: "loan",
  });

  it("lists linked savings and debt lines in place, at the account's figure or not set", () => {
    const saved = [SALARY, RENT, savingsLine, debtLine];
    const picture = buildWorkspacePicture({ budgetEntries: saved, accounts });
    const rows = pageBudgetEntries(saved, picture);
    // The typed rows are the saved objects; the ISA line reads its 300 a month; the loan has no
    // monthly payment saved, so its line is not set.
    expect(rows[0]).toBe(SALARY);
    expect(rows[1]).toBe(RENT);
    expect(
      rows.slice(2).map((r) => [r.id, r.amount, r.linked, r.linkedRowId, r.notSet ?? false]),
    ).toEqual([
      ["linked:savings:isa-line", 300, "savings", "isa-line", false],
      ["linked:debt:loan-line", 0, "debt", "loan-line", true],
    ]);
    expect(linkedSourceText(rows[2] as BudgetEntry, accounts)).toBe("From Stocks ISA");
    expect(linkedSourceText(rows[3] as BudgetEntry, accounts)).toBe(
      "Linked to Car loan, which has no monthly payment saved",
    );
    expect(linkedAccountFor({ linked: "debt", linkAccountId: "cur" }, accounts)).toBeNull();
  });
});

describe("what breathing room counts (characterisation)", () => {
  it("lists cash and savings accounts at no less than £0, and counts essential, housing and debt rows", () => {
    const accounts = [
      { id: "cur", name: "Current", type: "Current", balance: 1200 },
      { id: "sav", name: "Easy saver", type: "Saving", balance: 3000 },
      { id: "isa", name: "Stocks ISA", type: "Investment", balance: 9000 },
      { id: "od", name: "Joint current", type: "Current", balance: -300 },
    ];
    const entries = [
      SALARY,
      entry({ id: "home", category: "housing", name: "Rent", amount: 950, linked: "housing" }),
      entry({ id: "energy", category: "bills", name: "Energy", amount: 100, isEssential: true }),
      entry({ id: "tv", category: "expenses", name: "Streaming", amount: 15 }),
      entry({ id: "loan", category: "debt", name: "Loan payment", amount: 200 }),
      entry({ id: "gym", category: "expenses", name: "Gym", amount: 0, isEssential: true }),
    ];
    render(
      <BreathingRoomBasis
        accountDetails={[]}
        accounts={accounts}
        entries={entries}
        onSetEssential={vi.fn()}
      />,
    );
    // Draws on: Current, Easy saver and the overdrawn Joint current (shown as £0) = 3 accounts.
    // Spending (not income, above £0): Rent, Energy, Streaming, Loan payment = 4; counted: Rent
    // (housing), Energy (essential), Loan payment (debt) = 3.
    expect(screen.getByText("3 accounts, 3 of 4 spending entries")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /What Breathing room counts/ }));
    const accountsCard = screen.getByRole("region", { name: "Accounts it draws on" });
    expect(
      within(accountsCard)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Current£1,200", "Easy saver£3,000", "Joint current£0"]);
    expect(screen.getByText(/Debt payments are always counted/)).toBeTruthy();
    expect(screen.getByText(/From your housing details, always counted/)).toBeTruthy();
  });
});

describe("the breathing room illustration (characterisation)", () => {
  const accounts = [
    { id: "cur", name: "Current", type: "Current", balance: 2000, currency: "GBP" },
    { id: "sav", name: "Saver", type: "Saving", balance: 8000, currency: "GBP" },
    { id: "isa", name: "Stocks ISA", type: "Investment", balance: 15000, currency: "GBP" },
    { id: "pen", name: "Pension", type: "Pension", balance: 50000, currency: "GBP" },
  ];
  const entries = [
    entry({ id: "rent", category: "housing", name: "Rent", amount: 1000, isEssential: true }),
    entry({ id: "food", category: "expenses", name: "Groceries", amount: 500, isEssential: true }),
    entry({ id: "out", category: "expenses", name: "Dining", amount: 300 }),
    entry({ id: "side", category: "income", name: "Side income", amount: 400, isIncome: true }),
    entry({ id: "car", category: "debt", name: "Car loan", amount: 250 }),
  ];

  function zone() {
    const baseline = buildWorkspacePicture({ accounts, budgetEntries: entries }).monthsOfCover;
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={accounts}
        baseline={baseline}
        entries={entries}
      />,
    );
    const result = () => within(screen.getByTestId("runway-result"));
    return {
      outcome: () => screen.queryByTestId("runway-outcome")?.textContent ?? null,
      pool: () => result().getByRole("definition").textContent,
      reset: () => screen.queryByRole("button", { name: /Reset/ }),
    };
  }

  const type = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const openOptions = () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Accounts and income in this illustration" }),
    );

  it("starts from the saved figure: current and savings on, investments off, debt and essentials counted", () => {
    // Cash 2,000 + 8,000 = 10,000. Essentials 1,000 + 500 + debt 250 = 1,750 a month.
    // 10,000 / 1,750 = 5.714..., 5.7 months.
    const z = zone();
    expect(z.outcome()).toBe("5.7 months");
    expect(z.pool()).toBe("£10,000");
    expect(z.reset()).toBeNull();
  });

  it("adds a lump sum to the money to draw on", () => {
    // 10,000 + 5,000 = 15,000; 15,000 / 1,750 = 8.571..., 8.6 months.
    const z = zone();
    type("Redundancy pay or lump sum", "5000");
    expect(z.pool()).toBe("£15,000");
    expect(z.outcome()).toBe("8.6 months");
    expect(z.reset()).not.toBeNull();
  });

  it("caps the lump sum at £100,000", () => {
    // 250,000 is held at 100,000: 10,000 + 100,000 = 110,000.
    const z = zone();
    type("Redundancy pay or lump sum", "250000");
    expect(z.pool()).toBe("£110,000");
  });

  it("takes a monthly cut off the essentials", () => {
    // 1,750 - 250 = 1,500; 10,000 / 1,500 = 6.666..., 6.7 months.
    const z = zone();
    type("Spending you would cut each month", "250");
    expect(z.outcome()).toBe("6.7 months");
  });

  it("counts an investment account switched on, and other income kept", () => {
    const z = zone();
    openOptions();
    // Investments start off; on, the pool is 10,000 + 15,000 = 25,000.
    fireEvent.click(screen.getByRole("switch", { name: /Stocks ISA/ }));
    expect(z.pool()).toBe("£25,000");
    fireEvent.click(screen.getByRole("switch", { name: /Stocks ISA/ }));
    // Side income kept: 1,750 - 400 = 1,350; 10,000 / 1,350 = 7.407..., 7.4 months.
    fireEvent.click(screen.getByRole("switch", { name: /Side income/ }));
    expect(z.outcome()).toBe("7.4 months");
  });

  it("with no essential spending there is no saved figure and nothing to show", () => {
    const baseline = buildWorkspacePicture({
      accounts,
      budgetEntries: [entries[2] as BudgetEntry],
    }).monthsOfCover;
    render(
      <RunwayCalculator
        accountDetails={[]}
        accounts={accounts}
        baseline={baseline}
        entries={[entries[2] as BudgetEntry]}
      />,
    );
    // Nothing essential: 0 a month to pay, so no figure; the pool is the default 10,000.
    expect(screen.queryByTestId("runway-outcome")).toBeNull();
    expect(within(screen.getByTestId("runway-result")).getByRole("definition").textContent).toBe(
      "£10,000",
    );
  });
});
