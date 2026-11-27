// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "./ai-context-pack.js";
import {
  type BudgetPageEntry,
  breathingRoomFixedReason,
  budgetCategoryEntries,
  budgetEntryShownMonthly,
  budgetPageCategories,
  clampRunwayCut,
  clampRunwayLump,
  isIncomeCategory,
  isIncomeEntry,
  linkedAccountFor,
  linkedBudgetSource,
  pageBudgetRows,
  rankBudgetCategories,
  runwayIllustration,
  runwaySetup,
  selectBreathingRoomBasis,
  selectBudgetOverview,
  selectBudgetPageFromRows,
  selectRunwayIllustration,
} from "./budget-page.js";
import { figureKnown, figureRefused, figureUnknown } from "./picture/figure.js";
import type { MonthsOfCover } from "./picture/selectors/months-of-cover.js";

/**
 * The Budget page's rules in the engine (E12 S10). The cases are web's characterisation cases
 * (apps/web/app/features/budget/budgetPage.characterisation.test.tsx) at the engine's level, plus
 * the edges. Every expected value is worked out by hand, with the working beside it.
 */

let seq = 0;
function row(overrides: Partial<BudgetPageEntry> & { name?: string }): BudgetPageEntry & {
  name: string;
} {
  seq += 1;
  return {
    id: `row-${seq}`,
    category: "expenses",
    name: "Entry",
    amount: 100,
    frequency: "monthly",
    isIncome: false,
    isEssential: false,
    ...overrides,
  };
}

const NOV_2026 = new Date("2026-11-27T12:00:00Z");
const JUNE_2027 = new Date("2027-06-01T12:00:00Z");

const SALARY = { id: "salary", category: "income", name: "Salary", amount: 3000, isIncome: true };
const RENT = { id: "rent", category: "housing", name: "Rent", amount: 1000, isEssential: true };
const DINING = { id: "dining", category: "expenses", name: "Dining", amount: 500 };
const ISA = { id: "isa", category: "savings", name: "ISA", amount: 200 };
const LINKED_PAY = {
  id: "pay",
  category: "income",
  name: "Pay",
  amount: 0,
  isIncome: true,
  linkKind: "take_home",
};

const EMPLOYEE = {
  annualSalary: 36000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
};

function page(
  budgetEntries: Record<string, unknown>[],
  extra: {
    profile?: Record<string, unknown>;
    accounts?: Record<string, unknown>[];
    today?: Date;
  } = {},
) {
  return selectBudgetPageFromRows({
    budgetEntries,
    profile: (extra.profile ?? null) as never,
    accounts: (extra.accounts ?? []) as never,
    details: [],
    today: extra.today ?? NOV_2026,
  });
}

describe("isIncomeEntry and isIncomeCategory", () => {
  it("counts a flagged row or any row in 'income' as income", () => {
    expect(isIncomeEntry({ isIncome: true, category: "bills" })).toBe(true);
    expect(isIncomeEntry({ isIncome: false, category: "income" })).toBe(true);
    expect(isIncomeEntry({ isIncome: false, category: "bills" })).toBe(false);
  });

  it("treats a category as income only when nothing in it is spending", () => {
    expect(isIncomeCategory("income", [])).toBe(true);
    expect(isIncomeCategory("side", [{ isIncome: true, category: "side" }])).toBe(true);
    expect(isIncomeCategory("side", [])).toBe(false);
    expect(
      isIncomeCategory("income", [
        { isIncome: true, category: "income" },
        { isIncome: false, category: "income" },
      ]),
    ).toBe(true);
    expect(
      isIncomeCategory("side", [
        { isIncome: true, category: "side" },
        { isIncome: false, category: "side" },
      ]),
    ).toBe(false);
  });
});

describe("budgetEntryShownMonthly", () => {
  it.each([
    // -50 a month shows as 50.
    [{ amount: -50, frequency: "monthly" }, 50],
    // 100 a week: 100 x 52 / 12 = 433.333...
    [{ amount: 100, frequency: "weekly" }, 433.3333333333333],
    // 1,200 a year: 1,200 / 12 = 100.
    [{ amount: 1200, frequency: "annual" }, 100],
    // Joint 600 at 40%: 240.
    [{ amount: 600, frequency: "monthly", ownership: "joint", sharePercent: 40 }, 240],
  ])("%o shows %d a month", (entry, monthly) => {
    expect(budgetEntryShownMonthly(entry)).toBeCloseTo(monthly, 9);
  });
});

describe("budgetPageCategories", () => {
  it("lists the standard categories, then the person's own, then any an entry sits in, once each", () => {
    expect(
      budgetPageCategories(
        ["pets", "bills"],
        [{ category: "travel" }, { category: "housing" }, { category: "pets" }],
      ),
    ).toEqual(["housing", "bills", "expenses", "savings", "income", "pets", "travel"]);
  });
});

describe("rankBudgetCategories", () => {
  it("ranks by monthly amount at the person's share, ties in the order given", () => {
    const rows = rankBudgetCategories(
      ["housing", "bills", "expenses", "savings", "income"],
      [
        row({ category: "income", isIncome: true, amount: 3000 }),
        // 433.333... a month.
        row({ category: "expenses", amount: 100, frequency: "weekly" }),
        // 100 a month.
        row({ category: "bills", amount: 1200, frequency: "annual" }),
        // 900 joint at 40% = 360, plus 40: housing 400.
        row({ category: "housing", amount: 900, ownership: "joint", sharePercent: 40 }),
        row({ category: "housing", amount: 40 }),
        // 400: ties with housing, which comes first in the list.
        row({ category: "savings", amount: 400 }),
        // No amount: left out. 0.4 rounds to 0: left out.
        row({ category: "gym", amount: 0 }),
        row({ category: "tips", amount: 0.4 }),
        // 0.5 rounds to 1: kept, last.
        row({ category: "coffee", amount: 0.5 }),
      ],
    );
    expect(
      rows.map((r) => [r.category, Math.round(r.total * 100) / 100, r.count, r.notSet]),
    ).toEqual([
      ["expenses", 433.33, 1, false],
      ["housing", 400, 2, false],
      ["savings", 400, 1, false],
      ["bills", 100, 1, false],
      ["coffee", 0.5, 1, false],
    ]);
  });

  it("keeps a smaller category given first below a larger one given later", () => {
    const rows = rankBudgetCategories(
      ["a", "b"],
      [row({ category: "a", amount: 10 }), row({ category: "b", amount: 20 })],
    );
    expect(rows.map((r) => r.category)).toEqual(["b", "a"]);
  });

  it("keeps a not-set category, never counting the line as £0, and counts a negative row as its size", () => {
    const rows = rankBudgetCategories(
      ["housing", "bills"],
      [
        row({ category: "housing", amount: 0, linked: "housing", notSet: true }),
        // A not-set line beside a known one: the known one's 25 is the total, the row not set.
        row({ category: "bills", amount: 25 }),
        row({ category: "bills", amount: 999, notSet: true }),
        // -30 counts as 30: bills 25 + 30 = 55.
        row({ category: "bills", amount: -30 }),
      ],
    );
    expect(rows).toEqual([
      { category: "bills", total: 55, count: 3, notSet: true },
      { category: "housing", total: 0, count: 1, notSet: true },
    ]);
  });

  it("keeps empty categories in order when asked, and an amount too large to read counts as 0", () => {
    const huge = row({ category: "huge", amount: 1e308, frequency: "weekly" });
    expect(rankBudgetCategories(["housing", "bills"], [huge])).toEqual([]);
    expect(rankBudgetCategories(["housing", "bills"], [huge], { keepEmpty: true })).toEqual([
      { category: "housing", total: 0, count: 0, notSet: false },
      { category: "bills", total: 0, count: 0, notSet: false },
      { category: "huge", total: 0, count: 1, notSet: false },
    ]);
  });

  it("leaves out income categories and income rows inside a spending category", () => {
    const rows = rankBudgetCategories(
      ["side", "pets", "income"],
      [
        row({ category: "side", amount: 300, isIncome: true }),
        row({ category: "pets", amount: 30 }),
        row({ category: "pets", amount: 500, isIncome: true }),
      ],
    );
    expect(rows).toEqual([{ category: "pets", total: 30, count: 1, notSet: false }]);
  });
});

describe("budgetCategoryEntries", () => {
  it("shows a not-set line with no figure, and each entry's monthly figure when there are several", () => {
    const weekly = row({ category: "bills", amount: 60, frequency: "weekly" });
    const notSet = row({ category: "bills", amount: 0, notSet: true });
    const income = row({ category: "bills", amount: 50, isIncome: true });
    const other = row({ category: "pets", amount: 10 });
    expect(budgetCategoryEntries("bills", [weekly, notSet, income, other])).toEqual([
      // 60 x 52 / 12 = 260.
      { entry: weekly, figure: { kind: "amount", monthly: 260 } },
      { entry: notSet, figure: { kind: "notSet" } },
    ]);
  });

  it("shows the name only for a category's one entry, whose figure is the row's", () => {
    const only = row({ category: "pets", amount: 10 });
    expect(budgetCategoryEntries("pets", [only])).toEqual([
      { entry: only, figure: { kind: "nameOnly" } },
    ]);
    expect(budgetCategoryEntries("none", [only])).toEqual([]);
  });
});

describe("pageBudgetRows", () => {
  const saved = [
    { id: "r1", name: "Typed" },
    { id: "r2", name: "Rent" },
  ];
  const base: BudgetEntryItem = {
    id: "x",
    category: "income",
    name: "Take-home pay",
    amount: 2333,
    frequency: "monthly",
    isIncome: true,
    isEssential: true,
    ownership: "sole",
    sharePercent: null,
  };

  it("lists linked lines shaped like saved rows and saved rows as loaded, in the figures' order", () => {
    const rows = pageBudgetRows(saved, [
      { ...base, id: "linked:take-home", linked: "take_home", linkedRowId: "r9" },
      { ...base, id: "r2", linked: undefined },
      { ...base, id: "gone" },
      {
        ...base,
        id: "linked:savings:r3",
        category: "savings",
        name: "Saving",
        amount: 0,
        isIncome: false,
        isEssential: false,
        ownership: "joint",
        sharePercent: 50,
        linked: "savings",
        linkAccountId: "acc",
        notSet: true,
      },
      {
        ...base,
        id: "linked:housing",
        linked: "housing",
        linkAccountId: null,
        sharePercent: undefined,
      },
    ]);
    expect(rows).toEqual([
      {
        id: "linked:take-home",
        userId: "",
        category: "income",
        name: "Take-home pay",
        amount: 2333,
        frequency: "monthly",
        isIncome: true,
        isPrimaryIncome: false,
        isEssential: true,
        notes: null,
        isDefault: false,
        ownership: "sole",
        sharePercent: null,
        linked: "take_home",
        linkedRowId: "r9",
        createdAt: "",
        updatedAt: "",
      },
      saved[1],
      {
        id: "linked:savings:r3",
        userId: "",
        category: "savings",
        name: "Saving",
        amount: 0,
        frequency: "monthly",
        isIncome: false,
        isPrimaryIncome: false,
        isEssential: false,
        notes: null,
        isDefault: false,
        ownership: "joint",
        sharePercent: 50,
        linked: "savings",
        linkAccountId: "acc",
        notSet: true,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "linked:housing",
        userId: "",
        category: "income",
        name: "Take-home pay",
        amount: 2333,
        frequency: "monthly",
        isIncome: true,
        isPrimaryIncome: false,
        isEssential: true,
        notes: null,
        isDefault: false,
        ownership: "sole",
        sharePercent: null,
        linked: "housing",
        createdAt: "",
        updatedAt: "",
      },
    ]);
    expect(rows[1]).toBe(saved[1]);
  });
});

describe("linkedAccountFor and linkedBudgetSource", () => {
  const accounts = [
    { id: "isa", name: "Stocks ISA", type: "Investment" },
    { id: "loan", name: "Car loan", type: "Loan" },
    { id: "cur", name: "Current", type: "Current" },
  ];

  it("finds the account a savings or debt line reads while it still fits", () => {
    expect(linkedAccountFor({ linked: "savings", linkAccountId: "isa" }, accounts)).toBe(
      accounts[0],
    );
    expect(linkedAccountFor({ linked: "debt", linkAccountId: "loan" }, accounts)).toBe(accounts[1]);
    expect(linkedAccountFor({ linked: "debt", linkAccountId: "cur" }, accounts)).toBeNull();
    expect(linkedAccountFor({ linked: "savings", linkAccountId: "gone" }, accounts)).toBeNull();
    expect(linkedAccountFor({ linked: "savings", linkAccountId: null }, accounts)).toBeNull();
    expect(linkedAccountFor({ linked: "savings", linkAccountId: "" }, accounts)).toBeNull();
    expect(linkedAccountFor({ linked: "housing", linkAccountId: "isa" }, accounts)).toBeNull();
  });

  it("says where a linked line's figure comes from, or why it has none", () => {
    expect(linkedBudgetSource({ linked: "savings", linkAccountId: "isa" }, accounts)).toEqual({
      kind: "fromAccount",
      link: "savings",
      accountName: "Stocks ISA",
    });
    expect(
      linkedBudgetSource({ linked: "debt", linkAccountId: "loan", notSet: true }, accounts),
    ).toEqual({ kind: "accountNotSet", link: "debt", accountName: "Car loan" });
    expect(linkedBudgetSource({ linked: "debt", linkAccountId: "cur" }, accounts)).toEqual({
      kind: "accountGone",
    });
    expect(linkedBudgetSource({ linked: "housing", notSet: true }, accounts)).toEqual({
      kind: "housingNotSet",
    });
    expect(linkedBudgetSource({ linked: "housing" }, accounts)).toBeNull();
    expect(linkedBudgetSource({ linked: "take_home" }, accounts)).toBeNull();
    expect(linkedBudgetSource({}, accounts)).toBeNull();
  });
});

describe("the overview from the rows", () => {
  it("left over: 3,000 - 1,000 - 500 - 200 = 1,300; going out 1,700; safe to spend 1,800", () => {
    // Safe to spend: 3,000 - (essentials 1,000 + savings 200) - debt 0 = 1,800 a month.
    expect(page([SALARY, RENT, DINING, ISA]).overview).toEqual({
      hasIncome: true,
      income: 3000,
      surplus: 1300,
      heroFigure: 1300,
      isShort: false,
      goingOut: 1700,
      safeToSpendMonthly: 1800,
      salaryMissing: false,
      leavesOut: null,
      prompt: null,
      subline: "safeToSpend",
      supportingUnknown: false,
      showsEquation: true,
    });
  });

  it("short: 1,500 - 1,700 = -200, shown as 200; safe to spend 1,500 - 1,200 = 300", () => {
    const o = page([{ ...SALARY, amount: 1500 }, RENT, DINING, ISA]).overview;
    expect([o.surplus, o.heroFigure, o.isShort, o.safeToSpendMonthly]).toEqual([
      -200,
      200,
      true,
      300,
    ]);
  });

  it("exactly spent: 1,700 - 1,700 = 0 is left over, not short", () => {
    const o = page([{ ...SALARY, amount: 1700 }, RENT, DINING, ISA]).overview;
    expect([o.surplus, o.heroFigure, o.isShort]).toEqual([0, 0, false]);
  });

  it("income only: the whole 3,000 is left over, going out 0, and essentials are asked for", () => {
    const o = page([SALARY]).overview;
    expect(o).toMatchObject({
      heroFigure: 3000,
      goingOut: 0,
      safeToSpendMonthly: null,
      salaryMissing: false,
      subline: "addEssentials",
      showsEquation: true,
    });
  });

  it("no income: 0 - 1,000 = -1,000 but no headline figure and not short; going out 1,000; the salary is asked for", () => {
    const o = page([RENT]).overview;
    expect(o).toMatchObject({
      hasIncome: false,
      income: null,
      surplus: -1000,
      heroFigure: null,
      isShort: false,
      goingOut: 1000,
      salaryMissing: true,
      subline: "addSalary",
      supportingUnknown: false,
      showsEquation: true,
    });
  });

  it("no budget at all: both supporting figures unknown, one prompt for them, no equation", () => {
    const o = page([]).overview;
    expect(o).toMatchObject({
      goingOut: null,
      prompt: null,
      supportingUnknown: true,
      showsEquation: false,
    });
  });

  it("take-home not set: the prompt, no subline, never £0", () => {
    const o = page([LINKED_PAY, RENT]).overview;
    expect(o).toMatchObject({
      heroFigure: null,
      goingOut: null,
      prompt: { kind: "takeHomeNotSet" },
      subline: null,
      supportingUnknown: false,
      showsEquation: false,
    });
  });

  it("refused: Scotland in 2027/28 has no published rates, so the notice stands in", () => {
    const o = page([LINKED_PAY, RENT], {
      profile: { ...EMPLOYEE, taxRegion: "SCOTLAND" },
      today: JUNE_2027,
    }).overview;
    expect(o.prompt).toEqual({
      kind: "refused",
      notice:
        "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.",
    });
    expect(o.heroFigure).toBeNull();
  });

  it("housing not set: a linked housing line with no saved payment", () => {
    const housing = { ...RENT, amount: 0, linkKind: "housing" };
    expect(page([SALARY, housing]).overview.prompt).toEqual({ kind: "housingNotSet" });
  });

  it("says what a linked take-home leaves out: Plan 1 in 2027/28, take-home 2,333, 633 left over", () => {
    // 36,000 employee, 5% pension: 2,333 a month; no Plan 1 threshold for 2027/28, so no
    // repayment. 2,333 - 1,000 - 500 - 200 = 633.
    const o = page([LINKED_PAY, RENT, DINING, ISA], {
      profile: { ...EMPLOYEE, studentLoanPlans: ["PLAN_1"] },
      today: JUNE_2027,
    }).overview;
    expect(o.heroFigure).toBe(633);
    expect(o.leavesOut).toBe(
      "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.",
    );
  });

  it("reads the picture's figures directly: a refusal with no notice, or no not-set line, is not a refusal", () => {
    const unknownBudget = figureUnknown(["annualSalary"], "not-set");
    const safe = figureUnknown(["budget"], "not-set");
    const refusedNoNotice = {
      status: "unknown",
      missing: [],
      reason: "rates-not-published",
    } as const;
    expect(
      selectBudgetOverview({
        budget: unknownBudget,
        safeToSpend: safe,
        budgetRows: [{ linked: "take_home", notSet: true }],
        takeHome: refusedNoNotice,
      }).prompt,
    ).toEqual({ kind: "takeHomeNotSet" });
    expect(
      selectBudgetOverview({
        budget: unknownBudget,
        safeToSpend: safe,
        budgetRows: [{ linked: "take_home" }],
        takeHome: figureRefused({ notice: "Not published." }),
      }).prompt,
    ).toBeNull();
    expect(
      selectBudgetOverview({
        budget: unknownBudget,
        safeToSpend: safe,
        budgetRows: [{ linked: "take_home", notSet: true }],
        takeHome: figureUnknown(["annualSalary"], "not-set"),
      }).prompt,
    ).toEqual({ kind: "takeHomeNotSet" });
    const bare = selectBudgetOverview({ budget: unknownBudget, safeToSpend: safe });
    expect([bare.prompt, bare.salaryMissing, bare.subline]).toEqual([null, false, "addEssentials"]);
  });

  it("an empty assumptions list leaves nothing out", () => {
    const budget = figureKnown(
      {
        income: 100,
        essentials: 0,
        savings: 0,
        discretionary: 0,
        outgoings: 0,
        surplus: 100,
        debtPayments: 0,
        hasIncome: true,
        hasEssentials: false,
      },
      "assumption",
      [],
    );
    expect(
      selectBudgetOverview({ budget, safeToSpend: figureUnknown(["budgetEssentials"], "not-set") })
        .leavesOut,
    ).toBeNull();
  });
});

describe("what breathing room counts", () => {
  it("draws on cash and savings accounts at no less than £0, and counts essential, housing and debt rows", () => {
    const accounts = [
      { id: "cur", name: "Current", type: "Current", balance: 1200 },
      { id: "sav", name: "Easy saver", type: "Saving", balance: 3000 },
      { id: "isa", name: "Stocks ISA", type: "Investment", balance: 9000 },
      { id: "od", name: "Joint current", type: "Current", balance: -300 },
      { name: "No id", type: "Current", balance: 50 },
    ];
    const home = row({ category: "housing", amount: 950, linked: "housing" });
    const energy = row({ category: "bills", amount: 100, isEssential: true });
    const tv = row({ category: "expenses", amount: 15 });
    const loan = row({ category: "debt", amount: 200 });
    const tiny = row({ category: "expenses", amount: 0.01 });
    const entries = [
      row({ category: "income", amount: 3000, isIncome: true }),
      row({ category: "income", amount: 20 }),
      home,
      energy,
      tv,
      loan,
      row({ category: "expenses", amount: 0, isEssential: true }),
      tiny,
    ];
    const basis = selectBreathingRoomBasis(entries, accounts, []);
    expect(basis.drawOn.map((d) => [d.account.name, d.balance])).toEqual([
      ["Current", 1200],
      ["Easy saver", 3000],
      ["Joint current", 0],
    ]);
    // Spending above £0, not income: Rent, Energy, Streaming, Loan, the 0.01 row = 5; counted:
    // Rent (housing), Energy (essential), Loan (debt) = 3.
    expect(basis.spending.map((s) => [s.entry, s.monthly, s.fixedReason, s.counted])).toEqual([
      [home, 950, "housing", true],
      [energy, 100, null, true],
      [tv, 15, null, false],
      [loan, 200, "debt", true],
      [tiny, 0.01, null, false],
    ]);
    expect(basis.counted).toBe(3);
  });

  it("names a fixed reason only for the housing line and debt payments", () => {
    expect(breathingRoomFixedReason({ linked: "housing", category: "bills" })).toBe("housing");
    expect(breathingRoomFixedReason({ linked: "savings", category: "debt" })).toBe("debt");
    expect(breathingRoomFixedReason({ category: "housing" })).toBeNull();
  });
});

describe("the breathing room illustration", () => {
  const accounts = [
    { id: "cur", name: "Current", type: "Current", balance: 2000 },
    { id: "sav", name: "Saver", type: "Saving", balance: 8000 },
    { id: "isa", name: "Stocks ISA", type: "Investment", balance: 15000 },
    { id: "pen", name: "Pension", type: "Pension", balance: 50000 },
  ];
  const rent = row({ id: "rent", category: "housing", amount: 1000, isEssential: true });
  const food = row({ id: "food", category: "expenses", amount: 500, isEssential: true });
  const out = row({ id: "out", category: "expenses", amount: 300 });
  const side = row({ id: "side", category: "income", amount: 400, isIncome: true });
  const pay = row({
    id: "pay",
    category: "income",
    amount: 2000,
    isIncome: true,
    linked: "take_home",
  });
  const car = row({ id: "car", category: "debt", amount: 250 });
  const entries = [rent, food, out, side, pay, car];

  // The saved figure for these rows: cash 2,000 + 8,000 = 10,000; essentials 1,000 + 500 + debt
  // 250 = 1,750; 10,000 / 1,750 = 5.714..., 5.7 months.
  const saved = page(
    entries.map(({ linked: _l, ...e }) => e).filter((e) => e.id !== "pay") as never,
    { accounts },
  ).monthsOfCover;

  it("starts from the saved figure with current and savings on, investments off, debt and essentials counted", () => {
    const setup = runwaySetup(saved, entries, accounts, []);
    expect(setup.saved?.months).toBe(5.7);
    expect(setup.debtNotInBudget).toBe(0);
    expect(setup.poolAccounts.map((p) => [p.account.id, p.balance])).toEqual([
      ["cur", 2000],
      ["sav", 8000],
      ["isa", 15000],
    ]);
    expect(setup.defaultAccounts).toEqual({ cur: true, sav: true, isa: false });
    // The linked pay line stops with the income, so only the side income is offered, off.
    expect(setup.otherIncome).toEqual([{ entry: side, monthly: 400 }]);
    expect(setup.defaultIncome).toEqual({ side: false });
    expect(setup.expenses.map((e) => e.entry.id)).toEqual(["rent", "food", "out", "car"]);
    expect(setup.defaultExpenses).toEqual({ rent: true, food: true, out: false, car: true });
    expect(runwayIllustration(setup)).toEqual({
      totalPool: 10000,
      totalKeptIncome: 0,
      totalSelectedExpenses: 1750,
      pool: 10000,
      monthlyBurn: 1750,
      months: 5.7,
      isModified: false,
    });
  });

  it.each([
    // 10,000 + 5,000 = 15,000; 15,000 / 1,750 = 8.571..., 8.6.
    [{ severanceLump: 5000 }, 15000, 1750, 8.6],
    // Held at 100,000: 110,000 / 1,750 = 62.857..., 62.9.
    [{ severanceLump: 250000 }, 110000, 1750, 62.9],
    // A negative sum is held at 0.
    [{ severanceLump: -500 }, 10000, 1750, 5.7],
    // 1,750 - 250 = 1,500; 10,000 / 1,500 = 6.666..., 6.7.
    [{ extraMonthlyCut: 250 }, 10000, 1500, 6.7],
    // A negative cut is held at 0.
    [{ extraMonthlyCut: -100 }, 10000, 1750, 5.7],
    // A cut past the essentials: nothing to pay, so no figure.
    [{ extraMonthlyCut: 2000 }, 10000, 0, null],
    // Investments on: 10,000 + 15,000 = 25,000; 25,000 / 1,750 = 14.285..., 14.3.
    [{ includedAccounts: { isa: true } }, 25000, 1750, 14.3],
    // Savings off: 10,000 - 8,000 = 2,000; 2,000 / 1,750 = 1.142..., 1.1.
    [{ includedAccounts: { sav: false } }, 2000, 1750, 1.1],
    // Side income kept: 1,750 - 400 = 1,350; 10,000 / 1,350 = 7.407..., 7.4.
    [{ keptIncome: { side: true } }, 10000, 1350, 7.4],
  ])("%o gives a pool of %d, %d a month, %s months", (inputs, pool, burn, months) => {
    const result = selectRunwayIllustration({
      baseline: saved,
      entries,
      accounts,
      details: [],
      scenario: inputs,
    });
    expect([result.pool, result.monthlyBurn, result.months]).toEqual([pool, burn, months]);
  });

  it("is modified only when an input differs from where it starts", () => {
    const setup = runwaySetup(saved, entries, accounts, []);
    const modified = (inputs: Parameters<typeof runwayIllustration>[1]) =>
      runwayIllustration(setup, inputs).isModified;
    expect(
      modified({ includedAccounts: { cur: true, isa: false }, keptIncome: { side: false } }),
    ).toBe(false);
    expect(modified({ includedAccounts: { other: true } })).toBe(false);
    expect(modified({ severanceLump: 0, extraMonthlyCut: 0 })).toBe(false);
    expect(modified({ severanceLump: -10 })).toBe(false);
    expect(modified({ severanceLump: 1 })).toBe(true);
    expect(modified({ extraMonthlyCut: 1 })).toBe(true);
    expect(modified({ includedAccounts: { cur: false } })).toBe(true);
    expect(modified({ keptIncome: { side: true } })).toBe(true);
    expect(
      selectRunwayIllustration({ baseline: saved, entries, accounts, details: [] }).isModified,
    ).toBe(false);
  });

  it("with no saved figure, counts the default spending, kept income and the lump sum from the rows", () => {
    const unknown = figureUnknown<MonthsOfCover>(["budgetEssentials"], "not-set");
    // Pool 10,000 + 2,000 = 12,000. Spending 1,750 less side income 400 less cut 50 = 1,300.
    // 12,000 / 1,300 = 9.230..., 9.2.
    const result = selectRunwayIllustration({
      baseline: unknown,
      entries,
      accounts,
      details: [],
      scenario: { severanceLump: 2000, keptIncome: { side: true }, extraMonthlyCut: 50 },
    });
    expect(result.saved).toBeNull();
    expect(result.debtNotInBudget).toBe(0);
    expect([result.pool, result.monthlyBurn, result.months]).toEqual([12000, 1300, 9.2]);
    // Nothing essential: nothing to pay, no figure; the pool is the default 10,000.
    const none = selectRunwayIllustration({
      baseline: unknown,
      entries: [out],
      accounts,
      details: [],
    });
    expect([none.pool, none.monthlyBurn, none.months]).toEqual([10000, 0, null]);
  });

  it("names the debt minimums the saved figure counts beyond the budget's debt rows", () => {
    // A card of 1,800 with no payment saved: minimum max(25, 2.5% of 1,800 = 45) = 45, above the
    // budget's 0 of debt rows, so 45 is not in the budget.
    const withCard = [
      ...accounts,
      { id: "card", name: "Card", type: "Credit Card", balance: 1800 },
    ];
    const baseline = page([RENT], { accounts: withCard }).monthsOfCover;
    expect(runwaySetup(baseline, [rent], withCard, []).debtNotInBudget).toBe(45);
    // The car row's 250 is above the card's 45: nothing beyond the budget.
    const both = page([RENT, { id: "car", category: "debt", name: "Car", amount: 250 }], {
      accounts: withCard,
    }).monthsOfCover;
    expect(runwaySetup(both, [rent, car], withCard, []).debtNotInBudget).toBe(0);
  });

  it("never lets the money to draw on fall below £0 when the saved figure counts less cash", () => {
    const baseline = figureKnown<MonthsOfCover>({
      months: 0,
      liquidCash: 0,
      monthlyEssentials: 1500,
      commitments: {
        essentialsExcludingDebt: 1500,
        accountMinimums: 0,
        minimumsEstimated: false,
        budgetDebtPayments: 0,
        debtCommitment: 0,
        total: 1500,
        essentialSavings: 0,
      },
    });
    // 0 + (0 - 10,000) would be -10,000: held at 0.
    const result = selectRunwayIllustration({
      baseline,
      entries: [rent, food],
      accounts,
      details: [],
      scenario: { includedAccounts: { cur: false, sav: false } },
    });
    expect([result.pool, result.months]).toEqual([0, 0]);
    // An overdrawn account switched on counts as 0, never minus.
    const overdrawn = [{ id: "od", name: "Overdrawn", type: "Current", balance: -400 }];
    expect(
      selectRunwayIllustration({ baseline, entries: [rent], accounts: overdrawn, details: [] })
        .totalPool,
    ).toBe(0);
  });

  it("clamps the lump sum to 0 to 100,000 and the cut to 0 or more", () => {
    expect([
      clampRunwayLump(-1),
      clampRunwayLump(0),
      clampRunwayLump(100000),
      clampRunwayLump(100001),
    ]).toEqual([0, 0, 100000, 100000]);
    expect([clampRunwayCut(-0.01), clampRunwayCut(0), clampRunwayCut(250)]).toEqual([0, 0, 250]);
  });
});

describe("selectBudgetPageFromRows", () => {
  it("lists the categories with their entries and source lines, and the rows it counts", () => {
    const accounts = [
      {
        id: "isa",
        name: "Stocks ISA",
        type: "Investment",
        balance: 9000,
        monthlyContribution: 300,
      },
      { name: "No id", type: "Current", balance: 10 },
    ];
    const result = selectBudgetPageFromRows({
      budgetEntries: [
        SALARY,
        null,
        RENT,
        {
          id: "line",
          category: "savings",
          name: "ISA saving",
          amount: 0,
          linkKind: "savings",
          linkAccountId: "isa",
        },
        { id: "vet", category: "pets", name: "Vet", amount: 25 },
        { id: "food", category: "pets", name: "Food", amount: 15 },
      ],
      profile: { customBudgetCategories: ["pets", 7] } as never,
      accounts: accounts as never,
      details: null,
      today: NOV_2026,
    });
    // Housing 1,000; savings: the ISA's 300; pets 25 + 15 = 40.
    expect(result.categories.map((c) => [c.category, c.total])).toEqual([
      ["housing", 1000],
      ["savings", 300],
      ["pets", 40],
    ]);
    expect(result.categories[1]?.entries.map((e) => [e.entry.id, e.figure, e.source])).toEqual([
      [
        "linked:savings:line",
        { kind: "nameOnly" },
        { kind: "fromAccount", link: "savings", accountName: "Stocks ISA" },
      ],
    ]);
    expect(result.categories[2]?.entries.map((e) => [e.entry.id, e.figure])).toEqual([
      ["vet", { kind: "amount", monthly: 25 }],
      ["food", { kind: "amount", monthly: 15 }],
    ]);
    expect(result.rows.map((r) => r.id)).toEqual([
      "salary",
      "rent",
      "linked:savings:line",
      "vet",
      "food",
    ]);
    // An account with no id cannot be read from the snapshot, so it is not drawn on (as web);
    // the ISA is an investment, not drawn on either.
    expect(result.basis.drawOn).toEqual([]);
    // 3,000 - 1,000 - 300 - 40 = 1,660.
    expect(result.overview.heroFigure).toBe(1660);
    expect(result.runway.isModified).toBe(false);
    expect(result.ratesContext).toEqual({
      calendarYear: "2026/27",
      ratesYear: "2026/27",
      isFallback: false,
    });
    expect(result.takeHomeRates).toBeNull();
  });

  it("gives the rates context for a worked-out take-home line, and none before the first supported year", () => {
    const linked = page([LINKED_PAY, RENT], { profile: EMPLOYEE });
    expect(linked.takeHomeRates).toEqual(linked.ratesContext);
    expect(linked.takeHomeRates).not.toBeNull();
    const early = page([LINKED_PAY, RENT], {
      profile: EMPLOYEE,
      today: new Date("2015-06-01T12:00:00Z"),
    });
    expect(early.ratesContext).toBeNull();
    expect(early.takeHome).toEqual({ status: "unknown", missing: [], reason: "unsupported-year" });
  });

  it("reads missing rows as none", () => {
    const result = selectBudgetPageFromRows({ today: NOV_2026 });
    expect(result.rows).toEqual([]);
    expect(result.categories).toEqual([]);
    expect(result.budget).toEqual({ status: "unknown", missing: ["budget"], reason: "not-set" });
  });
});

describe("edges the mutation run asked for", () => {
  it("a housing line never reads an account, and an empty account id is no account", () => {
    const accounts = [
      { id: "loan", name: "Car loan", type: "Loan" },
      { id: "", name: "Blank", type: "Loan" },
    ];
    expect(linkedAccountFor({ linked: "housing", linkAccountId: "loan" }, accounts)).toBeNull();
    expect(linkedAccountFor({ linked: "debt", linkAccountId: "" }, accounts)).toBeNull();
  });

  it("a category is income only by its own rows, not by rows elsewhere", () => {
    expect(
      isIncomeCategory("side", [
        { isIncome: true, category: "side" },
        { isIncome: false, category: "pets" },
      ]),
    ).toBe(true);
  });

  it("never lists an income category, even when empty categories are kept", () => {
    expect(
      rankBudgetCategories(["income", "pets"], [row({ category: "income", amount: 3000 })], {
        keepEmpty: true,
      }).map((r) => r.category),
    ).toEqual(["pets"]);
  });

  it("keeps three tied categories in the order given", () => {
    const rows = rankBudgetCategories(
      ["c", "a", "b", "d"],
      [
        row({ category: "a", amount: 50 }),
        row({ category: "b", amount: 50 }),
        row({ category: "c", amount: 50 }),
        row({ category: "d", amount: 50 }),
      ],
    );
    expect(rows.map((r) => r.category)).toEqual(["c", "a", "b", "d"]);
  });

  it("joins what the budget leaves out with a space", () => {
    const budget = figureKnown(
      {
        income: 100,
        essentials: 0,
        savings: 0,
        discretionary: 0,
        outgoings: 0,
        surplus: 100,
        debtPayments: 0,
        hasIncome: true,
        hasEssentials: false,
      },
      "assumption",
      ["First note.", "Second note."],
    );
    expect(
      selectBudgetOverview({ budget, safeToSpend: figureUnknown(["budgetEssentials"], "not-set") })
        .leavesOut,
    ).toBe("First note. Second note.");
  });

  it("only a rates-not-published take-home is a refusal, whatever notice another reason carries", () => {
    expect(
      selectBudgetOverview({
        budget: figureUnknown(["annualSalary"], "not-set"),
        safeToSpend: figureUnknown(["budget"], "not-set"),
        budgetRows: [{ linked: "take_home", notSet: true }],
        takeHome: { status: "unknown", missing: [], reason: "unsupported-year", notice: "Other." },
      }).prompt,
    ).toEqual({ kind: "takeHomeNotSet" });
  });

  it("names an unnamed account with an empty name, and keeps the person's own category order", () => {
    const result = selectBudgetPageFromRows({
      accounts: [{ id: "cur", type: "Current", balance: 75 }],
      budgetEntries: [
        { id: "t", category: "travel", name: "Train", amount: 30 },
        { id: "p", category: "pets", name: "Vet", amount: 30 },
      ],
      profile: { customBudgetCategories: ["pets", "travel"] } as never,
      today: NOV_2026,
    });
    expect(result.basis.drawOn.map((d) => [d.account.name, d.balance])).toEqual([["", 75]]);
    // A tie at 30: the person's own order (pets, then travel), not the rows' order.
    expect(result.categories.map((c) => c.category)).toEqual(["pets", "travel"]);
  });
});
