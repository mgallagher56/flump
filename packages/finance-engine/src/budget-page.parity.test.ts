// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { selectBudgetPage, selectBudgetPageFromRows } from "./budget-page.js";
import { PERSONAS } from "./picture/__fixtures__/index.js";
import { buildFinancialPicture, financialPictureInputFromRows } from "./picture/build.js";

/**
 * Phone equals web (E12 S10 acceptance 1): the mobile app's one call from the API rows gives the
 * same take-home, budget rows, budget totals, safe to spend and breathing room as web's
 * `buildFinancialPicture`, and web's page assembly over its picture gives the same page.
 */

interface Rows {
  profile: Record<string, unknown> | null;
  accounts: Record<string, unknown>[];
  details: Record<string, unknown>[];
  budgetEntries: Record<string, unknown>[];
}

afterEach(() => {
  vi.useRealTimers();
});

function bothPaths(rows: Rows, today: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(today));
  const picture = buildFinancialPicture(
    financialPictureInputFromRows({
      profile: rows.profile as never,
      accounts: rows.accounts as never,
      accountDetails: rows.details as never,
      budgetEntries: rows.budgetEntries,
    }),
    { asOf: new Date(today) },
  );
  const phone = selectBudgetPageFromRows({
    profile: rows.profile as never,
    accounts: rows.accounts as never,
    details: rows.details as never,
    budgetEntries: rows.budgetEntries,
    today: new Date(today),
  });
  return { picture, phone };
}

function expectSameFigures(rows: Rows, today: string) {
  const { picture, phone } = bothPaths(rows, today);
  expect(phone.takeHome).toEqual(picture.takeHome);
  expect(phone.budgetRows).toEqual(picture.budgetRows);
  expect(phone.budget).toEqual(picture.budget);
  expect(phone.safeToSpend).toEqual(picture.safeToSpend);
  expect(phone.monthsOfCover).toEqual(picture.monthsOfCover);
  // Web's page assembly over its own picture is the same page the phone gets.
  const input = financialPictureInputFromRows({ budgetEntries: rows.budgetEntries });
  const web = selectBudgetPage({
    figures: picture,
    saved: input.budget,
    accounts: rows.accounts.map((a) => ({
      ...a,
      id: String(a.id ?? ""),
      name: typeof a.name === "string" ? a.name : "",
      type: typeof a.type === "string" ? a.type : "",
    })),
    details: rows.details as never,
    customCategories: [],
  });
  const {
    ratesContext: _rates,
    takeHomeRates: _takeHomeRates,
    isEmpty: _isEmpty,
    ...phonePage
  } = phone;
  expect(phonePage).toEqual(web);
  return phone;
}

describe("phone equals web: the engine's persona fixtures", () => {
  it.each(Object.entries(PERSONAS))("%s", (_name, { fixture: persona }) => {
    expectSameFigures(
      {
        profile: persona.profile as unknown as Record<string, unknown>,
        accounts: persona.accounts as Record<string, unknown>[],
        details: persona.details as Record<string, unknown>[],
        budgetEntries: persona.budget as unknown as Record<string, unknown>[],
      },
      "2026-11-27T12:00:00Z",
    );
  });
});

/** The renter and home owner households of apps/e2e/support/personas.ts (that module imports Playwright, so they are copied). */
const RENTER: Rows = {
  profile: {
    employmentType: "employed",
    annualSalary: 32000,
    monthlyTakeHome: 2085,
    taxRegion: "ENGLAND",
    studentLoanPlans: ["PLAN_2"],
    housingStatus: "renting",
    monthlyHousingCost: 950,
    pensionPercent: 5,
    isSalarySacrifice: false,
  },
  accounts: [
    { id: "r-cur", name: "Current account", type: "Current", balance: 1300 },
    {
      id: "r-sav",
      name: "Easy access savings",
      type: "Saving",
      balance: 3200,
      monthlyContribution: 150,
    },
    { id: "r-pen", name: "Workplace pension", type: "Pension", balance: 9000 },
    {
      id: "r-card",
      name: "Credit card",
      type: "Credit Card",
      balance: 1800,
      monthlyContribution: 60,
    },
    { id: "r-sl", name: "Student loan", type: "Student Loan", balance: 38500 },
  ],
  details: [],
  budgetEntries: [
    { id: "r1", name: "Salary after tax", category: "income", amount: 2085, isIncome: true },
    { id: "r2", name: "Rent", category: "housing", amount: 950, isEssential: true },
    { id: "r3", name: "Council tax", category: "bills", amount: 115, isEssential: true },
    { id: "r4", name: "Energy", category: "bills", amount: 80, isEssential: true },
    { id: "r5", name: "Phone and broadband", category: "bills", amount: 40, isEssential: true },
    { id: "r6", name: "Groceries", category: "expenses", amount: 250, isEssential: true },
    { id: "r7", name: "Travel", category: "expenses", amount: 120, isEssential: true },
    { id: "r8", name: "Eating out", category: "expenses", amount: 90 },
    { id: "r9", name: "Subscriptions", category: "expenses", amount: 25 },
    { id: "r10", name: "Everything else", category: "expenses", amount: 80 },
    { id: "r11", name: "Credit card payment", category: "bills", amount: 60, isEssential: true },
    { id: "r12", name: "Easy access savings", category: "savings", amount: 150 },
  ],
};

const HOMEOWNER: Rows = {
  profile: {
    employmentType: "employed",
    annualSalary: 58000,
    monthlyTakeHome: 3450,
    taxRegion: "ENGLAND",
    studentLoanPlans: [],
    housingStatus: "mortgage",
    monthlyHousingCost: 1250,
    propertyOwnershipShare: 100,
    pensionPercent: 8,
    isSalarySacrifice: false,
  },
  accounts: [
    { id: "h-cur", name: "Current account", type: "Current", balance: 3400 },
    {
      id: "h-sav",
      name: "Easy access savings",
      type: "Saving",
      balance: 7600,
      monthlyContribution: 200,
    },
    { id: "h-isa", name: "Cash ISA", type: "Saving", balance: 10000, monthlyContribution: 100 },
    { id: "h-home", name: "Home", type: "Property", balance: 310000 },
    {
      id: "h-mort",
      name: "Residential mortgage",
      type: "Mortgage",
      balance: 186000,
      monthlyContribution: 1250,
    },
    { id: "h-pen", name: "Workplace pension", type: "Pension", balance: 96000 },
    { id: "h-car", name: "Car loan", type: "Loan", balance: 8400, monthlyContribution: 265 },
    {
      id: "h-card",
      name: "Credit card",
      type: "Credit Card",
      balance: 1200,
      monthlyContribution: 40,
    },
  ],
  details: [],
  budgetEntries: [
    { id: "h1", name: "Salary after tax", category: "income", amount: 3450, isIncome: true },
    { id: "h2", name: "Mortgage payment", category: "housing", amount: 1250, isEssential: true },
    { id: "h3", name: "Council tax", category: "bills", amount: 190, isEssential: true },
    { id: "h4", name: "Energy", category: "bills", amount: 140, isEssential: true },
    { id: "h5", name: "Water", category: "bills", amount: 45, isEssential: true },
    { id: "h6", name: "Phone and broadband", category: "bills", amount: 55, isEssential: true },
    { id: "h7", name: "Home insurance", category: "bills", amount: 30, isEssential: true },
    { id: "h8", name: "Car loan payment", category: "bills", amount: 265, isEssential: true },
    { id: "h9", name: "Groceries", category: "expenses", amount: 520, isEssential: true },
    { id: "h10", name: "Travel", category: "expenses", amount: 180, isEssential: true },
    { id: "h11", name: "Eating out", category: "expenses", amount: 120 },
    { id: "h12", name: "Subscriptions", category: "expenses", amount: 40 },
    { id: "h13", name: "Everything else", category: "expenses", amount: 180 },
    { id: "h14", name: "Cash ISA", category: "savings", amount: 100 },
    { id: "h15", name: "Easy access savings", category: "savings", amount: 200 },
  ],
};

describe("phone equals web: the e2e households", () => {
  it("the renter: £125 left over, by hand", () => {
    const phone = expectSameFigures(RENTER, "2026-11-27T12:00:00Z");
    // 2,085 - (950 + 115 + 80 + 40 + 250 + 120 + 60) - (90 + 25 + 80) - 150 = 2,085 - 1,615 - 195
    // - 150 = 125.
    expect(phone.overview.heroFigure).toBe(125);
    expect(phone.overview.isShort).toBe(false);
  });

  it("the home owner: £135 left over, by hand", () => {
    const phone = expectSameFigures(HOMEOWNER, "2026-11-27T12:00:00Z");
    // Essentials 1,250 + 190 + 140 + 45 + 55 + 30 + 265 + 520 + 180 = 2,675; other 120 + 40 + 180
    // = 340; savings 300. 3,450 - 2,675 - 340 - 300 = 135.
    expect(phone.overview.heroFigure).toBe(135);
  });

  it("the renter with the pay line linked to take-home", () => {
    expectSameFigures(
      {
        ...RENTER,
        budgetEntries: RENTER.budgetEntries.map((row) =>
          row.id === "r1" ? { ...row, amount: 0, linkKind: "take_home" } : row,
        ),
      },
      "2026-11-27T12:00:00Z",
    );
  });
});

/** A household like staging's, with three recorded months from September to November 2026. */
const SAMPLE: Rows = {
  profile: {
    employmentType: "employed",
    annualSalary: 41000,
    taxRegion: "ENGLAND",
    studentLoanPlans: ["PLAN_2"],
    pensionPercent: 6,
    isSalarySacrifice: false,
    housingStatus: "renting",
    monthlyHousingCost: 1100,
    customBudgetCategories: ["pets"],
  },
  accounts: [
    { id: "s-cur", name: "Current", type: "Current", balance: 900 },
    { id: "s-sav", name: "Saver", type: "Saving", balance: 4200, monthlyContribution: 250 },
    { id: "s-isa", name: "Stocks ISA", type: "Investment", balance: 12000 },
    {
      id: "s-loan",
      name: "Joint car loan",
      type: "Loan",
      balance: 6000,
      monthlyContribution: 300,
      ownership: "joint",
      sharePercent: 50,
    },
    { id: "s-card", name: "Card", type: "Credit Card", balance: 700 },
  ],
  details: ["09", "10", "11"].flatMap((month, i) => [
    { account_id: "s-cur", year: 2026, month: Number(month), value: 700 + i * 100 },
    { account_id: "s-sav", year: 2026, month: Number(month), value: 3700 + i * 250 },
    { account_id: "s-loan", year: 2026, month: Number(month), value: 6600 - i * 300 },
  ]),
  budgetEntries: [
    { id: "s1", name: "Pay", category: "income", amount: 0, isIncome: true, linkKind: "take_home" },
    {
      id: "s2",
      name: "Rent",
      category: "housing",
      amount: 0,
      isEssential: true,
      linkKind: "housing",
    },
    {
      id: "s3",
      name: "Food",
      category: "expenses",
      amount: 70,
      frequency: "weekly",
      isEssential: true,
    },
    {
      id: "s4",
      name: "Insurance",
      category: "bills",
      amount: 600,
      frequency: "annual",
      isEssential: true,
    },
    {
      id: "s5",
      name: "Saving",
      category: "savings",
      amount: 0,
      linkKind: "savings",
      linkAccountId: "s-sav",
    },
    {
      id: "s6",
      name: "Car loan",
      category: "debt",
      amount: 0,
      linkKind: "debt",
      linkAccountId: "s-loan",
    },
    {
      id: "s7",
      name: "Holidays",
      category: "expenses",
      amount: 200,
      ownership: "joint",
      sharePercent: 40,
    },
    { id: "s8", name: "Vet", category: "pets", amount: 25 },
    { id: "s9", name: "Gym", category: "expenses", amount: 0 },
  ],
};

describe("phone equals web: a September to November 2026 sample", () => {
  it.each(["2026-09-15T12:00:00Z", "2026-10-15T12:00:00Z", "2026-11-27T12:00:00Z"])(
    "on %s",
    (today) => {
      expectSameFigures(SAMPLE, today);
    },
  );

  it("lists its custom category, linked rows and joint row from the same rows", () => {
    const { phone } = bothPaths(SAMPLE, "2026-11-27T12:00:00Z");
    // Pets: Vet 25. Holidays joint 200 at 40% = 80. Food 70 x 52 / 12 = 303.33. Insurance 600 / 12
    // = 50. Saving: the saver's 250. Car loan: 300 at the account's 50% = 150. Housing: rent 1,100.
    expect(phone.categories.map((c) => [c.category, Math.round(c.total * 100) / 100])).toEqual([
      ["housing", 1100],
      ["expenses", 383.33],
      ["savings", 250],
      ["debt", 150],
      ["bills", 50],
      ["pets", 25],
    ]);
  });
});
