import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../ai-context-pack.js";
import { DEFAULT_NET_WORTH_BASIS } from "../net-worth-basis.js";
import { PortfolioSnapshot, type RawAccount } from "../portfolio.js";
import type { TaxRecord } from "../tax-calculator.js";
import type { UkTaxYear } from "../types.js";
import {
  budgetEntryFromRow,
  buildFinancialPicture,
  financialPictureInputFromRows,
  linkedBudgetRowsFor,
} from "./build.js";
import { figureKnown, figureUnknown } from "./figure.js";
import type { FinancialPictureInput, ProfileFacts } from "./input.js";
import type { TakeHome } from "./selectors/take-home.js";

// A tax year the engine has no rates for: every figure that needs one says so.
const UNSUPPORTED_YEAR = "2019/20" as UkTaxYear;

const salaried: ProfileFacts = {
  annualSalary: 40000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
  housingStatus: null,
  monthlyHousingCost: null,
};

const noFacts = financialPictureInputFromRows({}).profile;

const saver = (monthlyContribution: number): RawAccount => ({
  id: "saver",
  name: "Easy access saver",
  type: "Saving",
  balance: 10000,
  monthlyContribution,
});

const row = (over: Partial<BudgetEntryItem>): BudgetEntryItem => ({
  id: "r",
  category: "bills",
  name: "Row",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ...over,
});

const savingsLine = row({
  id: "save",
  category: "savings",
  linkKind: "savings",
  linkAccountId: "saver",
});

const input = (over: Partial<FinancialPictureInput> = {}): FinancialPictureInput => ({
  profile: noFacts,
  netWorthBasis: DEFAULT_NET_WORTH_BASIS,
  accounts: [],
  details: [],
  budget: [],
  ...over,
});

describe("buildFinancialPicture: the tax year asked for", () => {
  it("reads take-home pay and the tax estimate for that year, not the current one", () => {
    const picture = buildFinancialPicture(input({ profile: salaried }), {
      taxYear: UNSUPPORTED_YEAR,
      asOf: new Date("2026-11-19T12:00:00Z"),
    });
    expect(picture.takeHome).toEqual(figureUnknown([], "unsupported-year"));
    expect(picture.estimatedTaxDue).toEqual(figureUnknown([], "unsupported-year"));
  });
});

describe("linkedBudgetRowsFor", () => {
  it("builds the snapshot from the rows when none is passed", () => {
    // The linked savings line reads the account's £200 a month.
    const result = linkedBudgetRowsFor(input({ accounts: [saver(200)], budget: [savingsLine] }));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ id: "linked:savings:save", amount: 200 });
  });

  it("reads the snapshot passed in", () => {
    // The rows hold no accounts; the snapshot passed in holds the saver at £300 a month.
    const result = linkedBudgetRowsFor(input({ budget: [savingsLine] }), {
      snapshot: new PortfolioSnapshot([saver(300)]),
    });
    expect(result.rows[0]).toMatchObject({ amount: 300 });
  });

  it("uses the take-home passed in instead of working one out", () => {
    // No salary saved, but the caller's take-home is £2,500 a month: with no income row in the
    // budget, the linked take-home line is added at £2,500.
    const passed = figureKnown<TakeHome>({
      monthly: 2500,
      annual: 30000,
      incomeTax: 0,
      nationalInsurance: 0,
      studentLoan: 0,
      pension: 0,
      taxYear: "2026/27",
      region: "ENGLAND_NI_WALES",
    });
    const result = linkedBudgetRowsFor(input({ budget: [row({ id: "bill", amount: 100 })] }), {
      takeHome: passed,
    });
    expect(result.rows[0]).toMatchObject({ linked: "take_home", amount: 2500 });
  });

  it("works out take-home pay for the tax year asked for", () => {
    // No rates for the year, so the line the person linked to take-home pay reads Not set.
    const result = linkedBudgetRowsFor(
      input({
        profile: salaried,
        budget: [row({ id: "pay", category: "income", isIncome: true, linkKind: "take_home" })],
      }),
      { taxYear: UNSUPPORTED_YEAR },
    );
    expect(result.rows[0]).toMatchObject({ linked: "take_home", notSet: true, amount: 0 });
  });
});

describe("budgetEntryFromRow", () => {
  it("keeps a stored id, and numbers a missing, empty or non-text one by position", () => {
    expect(budgetEntryFromRow({ id: "abc" }, 4).id).toBe("abc");
    expect(budgetEntryFromRow({ id: "" }, 3).id).toBe("budget-3");
    expect(budgetEntryFromRow({ id: 42 }, 2).id).toBe("budget-2");
    expect(budgetEntryFromRow({}).id).toBe("budget-0");
  });

  it("keeps text category and name, and reads anything else as empty", () => {
    expect(budgetEntryFromRow({ category: "bills", name: "Water" })).toMatchObject({
      category: "bills",
      name: "Water",
    });
    expect(budgetEntryFromRow({})).toMatchObject({ category: "", name: "" });
    expect(budgetEntryFromRow({ category: 7, name: 7 })).toMatchObject({ category: "", name: "" });
  });

  it("keeps a stored frequency and reads a missing, empty or non-text one as monthly", () => {
    expect(budgetEntryFromRow({ frequency: "annual" }).frequency).toBe("annual");
    expect(budgetEntryFromRow({ frequency: "" }).frequency).toBe("monthly");
    expect(budgetEntryFromRow({}).frequency).toBe("monthly");
    expect(budgetEntryFromRow({ frequency: 12 }).frequency).toBe("monthly");
  });

  it("is joint only when stored as joint", () => {
    expect(budgetEntryFromRow({ ownership: "joint" }).ownership).toBe("joint");
    expect(budgetEntryFromRow({ ownership: "sole" }).ownership).toBe("sole");
    expect(budgetEntryFromRow({}).ownership).toBe("sole");
  });

  it("reads a stored share from a number or numeric text, and null otherwise", () => {
    expect(budgetEntryFromRow({ sharePercent: 40 }).sharePercent).toBe(40);
    expect(budgetEntryFromRow({ sharePercent: "40" }).sharePercent).toBe(40);
    for (const unreadable of [null, undefined, "", "abc", Number.NaN, true]) {
      expect(budgetEntryFromRow({ sharePercent: unreadable }).sharePercent).toBeNull();
    }
  });

  it("never carries the stored primary income flag (system audit leftovers, item 5)", () => {
    for (const flag of [true, false, undefined, "true"]) {
      expect(budgetEntryFromRow({ isPrimaryIncome: flag })).not.toHaveProperty("isPrimaryIncome");
    }
  });

  it("sets the linked account only for a non-empty text id", () => {
    expect(budgetEntryFromRow({ linkAccountId: "acc-1" }).linkAccountId).toBe("acc-1");
    for (const id of ["", null, 5]) {
      expect(budgetEntryFromRow({ linkAccountId: id })).not.toHaveProperty("linkAccountId");
    }
  });
});

describe("financialPictureInputFromRows", () => {
  it("reads missing rows as empty lists", () => {
    const mapped = financialPictureInputFromRows({});
    expect(mapped.accounts).toEqual([]);
    expect(mapped.details).toEqual([]);
    expect(mapped.budget).toEqual([]);
    expect(mapped.taxRecords).toEqual([]);
  });

  it("copies the account details and tax records it is given", () => {
    const accountDetails = [{ accountId: "saver", year: 2026, month: 10, value: 10000 }];
    const taxRecords = [{ id: "t1" } as TaxRecord];
    const mapped = financialPictureInputFromRows({ accountDetails, taxRecords });
    expect(mapped.details).toEqual(accountDetails);
    expect(mapped.details).not.toBe(accountDetails);
    expect(mapped.taxRecords).toEqual(taxRecords);
    expect(mapped.taxRecords).not.toBe(taxRecords);
  });
});
