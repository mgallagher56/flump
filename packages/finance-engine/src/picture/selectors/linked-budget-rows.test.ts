import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot } from "../../portfolio.js";
import {
  budgetEntryFromRow,
  buildFinancialPicture,
  financialPictureInputFromRows,
} from "../build.js";
import { figureKnown, figureUnknown, isFigureKnown } from "../figure.js";
import { selectBudgetTotals } from "./budget-totals.js";
import { selectHousingPayment } from "./housing-cost.js";
import {
  LINKED_HOUSING_ID,
  LINKED_TAKE_HOME_ID,
  listedBudgetEntries,
  withLinkedBudgetRows,
} from "./linked-budget-rows.js";
import type { TakeHome } from "./take-home.js";

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

const takeHome = (monthly: number) =>
  figureKnown<TakeHome>({
    monthly,
    annual: monthly * 12,
    incomeTax: 0,
    nationalInsurance: 0,
    studentLoan: 0,
    pension: 0,
    taxYear: "2026-27" as TakeHome["taxYear"],
    region: "ENGLAND_NI_WALES",
  });

const noTakeHome = figureUnknown<TakeHome>(["annualSalary"], "not-set");
const emptyProfile = financialPictureInputFromRows({}).profile;

const totalsOf = (rows: BudgetEntryItem[]) => {
  const totals = selectBudgetTotals(rows);
  if (!isFigureKnown(totals)) throw new Error("expected known");
  return totals.value;
};

const rent = (monthly: number) => ({ kind: "rent" as const, monthly, paymentEstimated: false });

describe("withLinkedBudgetRows: take-home pay (owner item 7)", () => {
  it("adds the take-home row when the budget has no income row", () => {
    // Profile take-home £2,500 a month; budget holds one £1,000 rent row.
    // Income = 2,500 (linked), essentials = 1,000, left over = 2,500 - 1,000 = 1,500.
    const { rows, offers } = withLinkedBudgetRows(
      [row({ id: "bill", category: "bills", amount: 1000 })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows[0]).toMatchObject({ id: LINKED_TAKE_HOME_ID, amount: 2500, linked: "take_home" });
    expect(totalsOf(rows)).toMatchObject({ income: 2500, essentials: 1000, surplus: 1500 });
    expect(offers).toEqual([]);
  });

  it("counts only the person's own pay when they have an income row, and offers the link", () => {
    // Salary saved (take-home £2,500) and a "Paycheck" row of £2,000. Only the £2,000 counts:
    // income = 2,000, not 2,000 + 2,500 = 4,500. The take-home is offered for that row.
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [row({ id: "p", category: "income", name: "Paycheck", amount: 2000, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual(["p"]);
    expect(shadowedRowIds).toEqual([]);
    expect(totalsOf(rows).income).toBe(2000);
    expect(offers).toEqual([{ link: "take_home", monthly: 2500, kind: null, rowIds: ["p"] }]);
  });

  it.each(["Acme Ltd", "Main job", "Salary", "Partner's salary", "Child Benefit"])(
    "reads no meaning into the name %s",
    (name) => {
      // Any income row of £1,800 is the person's own figure: income = 1,800, nothing linked.
      const { rows } = withLinkedBudgetRows(
        [row({ id: "o", category: "income", name, amount: 1800, isIncome: true })],
        { takeHome: takeHome(2500), housing: null },
      );
      expect(rows.map((r) => r.id)).toEqual(["o"]);
      expect(totalsOf(rows).income).toBe(1800);
    },
  );

  it("adds the take-home row beside a £0 income row, which stays listed", () => {
    // A £0 "Salary" row is no figure: the linked £2,500 is added. Income = 2,500 + 0 = 2,500.
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [row({ id: "s", category: "income", name: "Salary", amount: 0, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_TAKE_HOME_ID, "s"]);
    expect(shadowedRowIds).toEqual([]);
    expect(totalsOf(rows).income).toBe(2500);
  });

  it("reads the take-home in place of the row the person chose, keeping their other income", () => {
    // "Paycheck" chosen (stored at £0, linkKind take-home) and Child Benefit £102.
    // Income = 2,500 + 102 = 2,602.
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [
        row({
          id: "p",
          category: "income",
          name: "Paycheck",
          amount: 0,
          isIncome: true,
          linkKind: "take_home",
        }),
        row({ id: "cb", category: "income", name: "Child Benefit", amount: 102, isIncome: true }),
      ],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_TAKE_HOME_ID, "cb"]);
    expect(shadowedRowIds).toEqual(["p"]);
    expect(totalsOf(rows).income).toBe(2602);
    expect(offers).toEqual([]);
  });

  it("adds nothing without a known take-home", () => {
    const budget = [row({ id: "a", amount: 50 })];
    expect(withLinkedBudgetRows(budget, { takeHome: noTakeHome, housing: null }).rows).toEqual(
      budget,
    );
  });
});

describe("withLinkedBudgetRows: housing (owner item 33b)", () => {
  it("a sole renter: the saved rent fills the one empty housing row, carrying its id", () => {
    // Saved rent £950; one housing row "Rent or mortgage" at £0, sole. Nothing was typed, so the
    // saved figure stands in for it: essentials = 950. The line carries the row's id so the
    // editor can turn it back into an ordinary row ("Type my own figure").
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [row({ id: "h", category: "housing", name: "Rent or mortgage", amount: 0 })],
      { takeHome: noTakeHome, housing: rent(950) },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_HOUSING_ID]);
    expect(rows[0]).toMatchObject({
      name: "Rent",
      amount: 950,
      ownership: "sole",
      linkedRowId: "h",
    });
    expect(shadowedRowIds).toEqual(["h"]);
    expect(offers).toEqual([]);
    expect(totalsOf(rows).essentials).toBe(950);
  });

  it("a single housing row with a typed figure is kept and the link offered, whatever its name", () => {
    // Saved rent £1,000; the one housing row is "Mortgage" £900 (or "Home insurance" £20). A typed
    // figure never leaves the totals unasked: essentials = 900, and "Use your saved rent" is offered.
    for (const [name, amount] of [
      ["Mortgage", 900],
      ["Home insurance", 20],
    ] as const) {
      const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
        [row({ id: "h", category: "housing", name, amount })],
        { takeHome: noTakeHome, housing: rent(1000) },
      );
      expect(rows.map((r) => r.id)).toEqual(["h"]);
      expect(shadowedRowIds).toEqual([]);
      expect(totalsOf(rows).essentials).toBe(amount);
      expect(offers).toEqual([{ link: "housing", monthly: 1000, kind: "rent", rowIds: ["h"] }]);
    }
  });

  it("a 50% joint renter: the linked row keeps the row's share", () => {
    // Saved rent £1,200 (the whole rent, as onboarding asks it). The one housing row,
    // "Rent (my share)", is empty and joint at 50%. Linked row counts 1,200 x 50% = 600, never 1,200.
    const { rows } = withLinkedBudgetRows(
      [
        row({
          id: "h",
          category: "housing",
          name: "Rent (my share)",
          amount: 0,
          ownership: "joint",
          sharePercent: 50,
        }),
      ],
      { takeHome: noTakeHome, housing: rent(1200) },
    );
    expect(rows[0]).toMatchObject({ id: LINKED_HOUSING_ID, ownership: "joint", sharePercent: 50 });
    expect(totalsOf(rows).essentials).toBe(600);
  });

  it("two housing rows: changes nothing and offers the link", () => {
    // Saved mortgage £950; rows "Mortgage" £900 and "Service charge" £80 stay as typed:
    // essentials = 900 + 80 = 980.
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [
        row({ id: "m", category: "housing", name: "Mortgage", amount: 900 }),
        row({ id: "sc", category: "housing", name: "Service charge", amount: 80 }),
      ],
      {
        takeHome: noTakeHome,
        housing: { kind: "mortgage", monthly: 950, paymentEstimated: false },
      },
    );
    expect(rows.map((r) => r.id)).toEqual(["m", "sc"]);
    expect(shadowedRowIds).toEqual([]);
    expect(totalsOf(rows).essentials).toBe(980);
    expect(offers).toEqual([
      { link: "housing", monthly: 950, kind: "mortgage", rowIds: ["m", "sc"] },
    ]);
  });

  it("two housing rows, one chosen: the saved figure stands in for it with its share", () => {
    // "Mortgage" chosen (stored £0, joint 50%, linkKind housing) and "Service charge" £80.
    // Essentials = 950 x 50% + 80 = 475 + 80 = 555.
    const { rows, offers } = withLinkedBudgetRows(
      [
        row({
          id: "m",
          category: "housing",
          name: "Mortgage",
          amount: 0,
          ownership: "joint",
          sharePercent: 50,
          linkKind: "housing",
        }),
        row({ id: "sc", category: "housing", name: "Service charge", amount: 80 }),
      ],
      {
        takeHome: noTakeHome,
        housing: { kind: "mortgage", monthly: 950, paymentEstimated: false },
      },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_HOUSING_ID, "sc"]);
    expect(totalsOf(rows).essentials).toBe(555);
    expect(offers).toEqual([]);
  });

  it("adds the housing row when the budget has no housing row", () => {
    const { rows } = withLinkedBudgetRows([row({ id: "g", category: "expenses", amount: 300 })], {
      takeHome: noTakeHome,
      housing: { kind: "mortgage", monthly: 1234.56, paymentEstimated: true },
    });
    expect(rows).toEqual([
      expect.objectContaining({ id: "g" }),
      expect.objectContaining({ name: "Mortgage payment", amount: 1234.56 }),
    ]);
  });

  it("adds nothing to a budget with no rows, which stays unknown", () => {
    const linked = withLinkedBudgetRows([], { takeHome: takeHome(2500), housing: rent(950) });
    expect(linked.rows).toEqual([]);
    expect(selectBudgetTotals(linked.rows).status).toBe("unknown");
  });

  it("lets a typed housing row win over the mortgage estimate, adding no linked row", () => {
    // Estimate £1,234.56. Typed "Mortgage" £600, joint at 50%: it counts 600 x 50% = 300.
    // No linked row and no offer, so essentials = 300 (not 300 + 1,234.56).
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [
        row({
          id: "m",
          category: "housing",
          name: "Mortgage",
          amount: 600,
          ownership: "joint",
          sharePercent: 50,
        }),
      ],
      {
        takeHome: noTakeHome,
        housing: { kind: "mortgage", monthly: 1234.56, paymentEstimated: true },
      },
    );
    expect(rows.map((r) => r.id)).toEqual(["m"]);
    expect(shadowedRowIds).toEqual([]);
    expect(offers).toEqual([]);
    expect(totalsOf(rows).essentials).toBe(300);
  });

  it("the estimate stands in for a £0 housing row as the person's share already", () => {
    // Estimate £1,234.56, worked out from a share-scaled balance, so already the person's share.
    // The £0 "Mortgage" row is marked joint at 50%; the share is not taken twice:
    // essentials = 300 + 1,234.56 = 1,534.56 (not 300 + 617.28).
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [
        row({ id: "g", category: "expenses", name: "Groceries", amount: 300 }),
        row({
          id: "m",
          category: "housing",
          name: "Mortgage",
          amount: 0,
          ownership: "joint",
          sharePercent: 50,
        }),
      ],
      {
        takeHome: noTakeHome,
        housing: { kind: "mortgage", monthly: 1234.56, paymentEstimated: true, isOwnShare: true },
      },
    );
    expect(rows.map((r) => r.id)).toEqual(["g", LINKED_HOUSING_ID]);
    expect(rows[1]).toMatchObject({ ownership: "sole", sharePercent: null });
    expect(shadowedRowIds).toEqual(["m"]);
    expect(totalsOf(rows).essentials).toBeCloseTo(1534.56, 2);
  });

  it("keeps the budget's own housing row while no housing payment is saved", () => {
    const budget = [row({ id: "rent", category: "housing", name: "Rent", amount: 900 })];
    expect(withLinkedBudgetRows(budget, { takeHome: noTakeHome, housing: null }).rows).toEqual(
      budget,
    );
  });
});

describe("selectHousingPayment", () => {
  const snapshot = new PortfolioSnapshot([]);
  it("reads the saved rent with no salary needed", () => {
    expect(
      selectHousingPayment(
        { ...emptyProfile, housingStatus: "renting", monthlyHousingCost: 950 },
        snapshot,
        [],
      ),
    ).toEqual({ kind: "rent", monthly: 950, paymentEstimated: false });
  });

  it("is null when nothing is saved", () => {
    expect(selectHousingPayment(emptyProfile, snapshot, [])).toBeNull();
  });
});

describe("buildFinancialPicture with linked rows", () => {
  it("counts the saved rent once and lists the rows it counts", () => {
    // Renting at £800 saved; budget has an empty "Rent" row (£0) and Groceries £300 (essential).
    // The saved rent fills the empty row: essentials = 800 + 300 = 1,100. Cash £3,300 / 1,100 = 3.0.
    const picture = buildFinancialPicture(
      financialPictureInputFromRows({
        profile: { housingStatus: "renting", monthlyHousingCost: 800 },
        accounts: [{ id: "cur", name: "Current", type: "Current", balance: 3300 }],
        budgetEntries: [
          { id: "rent", category: "housing", name: "Rent", amount: 0, isEssential: true },
          { id: "g", category: "expenses", name: "Groceries", amount: 300, isEssential: true },
        ],
      }),
    );
    expect(picture.shadowedBudgetRowIds).toEqual(["rent"]);
    expect(picture.budgetRows.map((r) => r.id)).toEqual([LINKED_HOUSING_ID, "g"]);
    if (!isFigureKnown(picture.budget) || !isFigureKnown(picture.monthsOfCover)) {
      throw new Error("expected known");
    }
    expect(picture.budget.value.essentials).toBe(1100);
    expect(picture.monthsOfCover.value.months).toBe(3);
  });

  it("keeps a typed rent row and offers the saved one", () => {
    // Renting at £800 saved; "Rent" typed £700 and Groceries £300. The typed £700 stays:
    // essentials = 700 + 300 = 1,000. Cash £3,300 / 1,000 = 3.3 months.
    const picture = buildFinancialPicture(
      financialPictureInputFromRows({
        profile: { housingStatus: "renting", monthlyHousingCost: 800 },
        accounts: [{ id: "cur", name: "Current", type: "Current", balance: 3300 }],
        budgetEntries: [
          { id: "rent", category: "housing", name: "Rent", amount: 700, isEssential: true },
          { id: "g", category: "expenses", name: "Groceries", amount: 300, isEssential: true },
        ],
      }),
    );
    expect(picture.shadowedBudgetRowIds).toEqual([]);
    expect(picture.budgetLinkOffers.map((o) => o.rowIds)).toEqual([["rent"]]);
    if (!isFigureKnown(picture.budget) || !isFigureKnown(picture.monthsOfCover)) {
      throw new Error("expected known");
    }
    expect(picture.budget.value.essentials).toBe(1000);
    expect(picture.monthsOfCover.value.months).toBe(3.3);
  });
});

describe("selectHousingPayment: the estimate is the person's share", () => {
  it("works out a joint mortgage's payment on the person's share of the balance", () => {
    // £100,000 owed, joint at 50%: the snapshot counts £50,000. At 6% over 12 months,
    // r = 0.06 / 12 = 0.005, n = 12: payment = 50,000 x 0.005 / (1 - 1.005^-12)
    // = 250 / (1 - 0.941905) = 250 / 0.058095 = £4,303.32 a month (to the penny).
    const accounts = [
      {
        id: "a",
        name: "Mortgage",
        type: "Mortgage",
        balance: 100000,
        interestRate: 6,
        termMonths: 12,
        ownership: "joint",
        sharePercent: 50,
      },
    ];
    expect(
      selectHousingPayment(
        { ...emptyProfile, housingStatus: "mortgage" },
        new PortfolioSnapshot(accounts, []),
        accounts,
      ),
    ).toEqual({ kind: "mortgage", monthly: 4303.32, paymentEstimated: true, isOwnShare: true });
  });
});

describe("withLinkedBudgetRows: a linked line's stored amount is never read (decision 1)", () => {
  const pay = row({
    id: "pay",
    category: "income",
    name: "Paycheck",
    amount: 0,
    isIncome: true,
    linkKind: "take_home",
  });
  const rentRow = row({
    id: "rent",
    category: "housing",
    name: "Our rent",
    amount: 0,
    linkKind: "housing",
    ownership: "joint",
    sharePercent: 50,
  });
  const food = row({ id: "food", category: "expenses", name: "Food", amount: 300 });

  it("marks a linked take-home line Not set when no take-home can be worked out", () => {
    const { rows, shadowedRowIds } = withLinkedBudgetRows([pay, food], {
      takeHome: noTakeHome,
      housing: null,
    });
    expect(rows[0]).toMatchObject({
      id: LINKED_TAKE_HOME_ID,
      linked: "take_home",
      linkedRowId: "pay",
      notSet: true,
    });
    expect(shadowedRowIds).toEqual(["pay"]);
    // Unknown, naming the salary: never income £0 and £300 short each month.
    expect(selectBudgetTotals(rows)).toEqual(figureUnknown(["annualSalary"], "not-set"));
  });

  it("marks a linked housing line Not set when no housing payment is saved, keeping its name and share", () => {
    const { rows } = withLinkedBudgetRows([rentRow, food], { takeHome: noTakeHome, housing: null });
    expect(rows[0]).toMatchObject({
      id: LINKED_HOUSING_ID,
      name: "Our rent",
      linked: "housing",
      linkedRowId: "rent",
      notSet: true,
      ownership: "joint",
      sharePercent: 50,
    });
    expect(selectBudgetTotals(rows)).toEqual(figureUnknown(["monthlyHousingCost"], "not-set"));
  });

  it("resolves a joint linked rent at the person's share", () => {
    // Rent £1,000 saved, the row joint at 50%: £500 counts. Essentials = 500 + 300 = 800.
    const { rows } = withLinkedBudgetRows([rentRow, food], {
      takeHome: noTakeHome,
      housing: rent(1000),
    });
    expect(rows[0]).toMatchObject({ amount: 1000, linkedRowId: "rent", ownership: "joint" });
    expect(rows[0]?.notSet).toBeUndefined();
    expect(totalsOf(rows).essentials).toBe(800);
  });

  it("does not read a stored amount left on a linked row", () => {
    // A linked row that somehow kept £1,800 stored still reads the take-home of £2,500.
    const { rows } = withLinkedBudgetRows([{ ...pay, amount: 1800 }], {
      takeHome: takeHome(2500),
      housing: null,
    });
    expect(totalsOf(rows).income).toBe(2500);
    // With no take-home, the stored £1,800 is not used either.
    const unresolved = withLinkedBudgetRows([{ ...pay, amount: 1800 }], {
      takeHome: noTakeHome,
      housing: null,
    });
    expect(selectBudgetTotals(unresolved.rows).status).toBe("unknown");
  });
});

describe("listedBudgetEntries", () => {
  it("lists the resolved budget: linked figures, Not set lines and added lines, shadowed rows gone", () => {
    // Take-home £2,500; "pay" linked to it; "rent" linked with no housing saved (Not set); food £300.
    const entries = [
      row({
        id: "pay",
        name: "Paycheck",
        category: "income",
        isIncome: true,
        linkKind: "take_home",
      }),
      row({ id: "rent", name: "Our rent", category: "housing", linkKind: "housing" }),
      row({ id: "food", category: "expenses", amount: 300 }),
    ];
    const { rows } = withLinkedBudgetRows(entries, { takeHome: takeHome(2500), housing: null });
    const listed = listedBudgetEntries(entries, rows);
    expect(listed.map((e) => [e.id, e.name, e.amount, e.notSet ?? false])).toEqual([
      ["pay", "Paycheck", 2500, false],
      ["rent", "Our rent", 0, true],
      ["food", "Row", 300, false],
    ]);
  });

  it("lists the lines the engine adds and replaces, and keeps the caller's (anonymised) names", () => {
    // No income rows, take-home £2,500: "Take-home pay" is added. Saved rent £1,000 fills the one
    // empty housing row, shown under the caller's name for it ("Bills 1"). Income 2,500, housing 1,000.
    const entries = [row({ id: "h", name: "Landlord J Smith", category: "housing", amount: 0 })];
    const { rows } = withLinkedBudgetRows(entries, {
      takeHome: takeHome(2500),
      housing: rent(1000),
    });
    const listed = listedBudgetEntries(
      [{ ...(entries[0] as BudgetEntryItem), name: "Bills 1" }],
      rows,
    );
    expect(listed.map((e) => [e.id, e.name, e.amount])).toEqual([
      [LINKED_TAKE_HOME_ID, "Take-home pay", 2500],
      ["h", "Bills 1", 1000],
    ]);
  });
});

describe("withLinkedBudgetRows: one row per linked fact", () => {
  it("marks a second row linked to the same fact Not set, never its stored £0", () => {
    // Two income rows both linked to take-home £2,500: the first reads £2,500, the second is Not
    // set, so income is unknown rather than 2,500 + 0 (or 2,500 + 2,500).
    const { rows, shadowedRowIds } = withLinkedBudgetRows(
      [
        row({ id: "a", category: "income", isIncome: true, linkKind: "take_home" }),
        row({ id: "b", category: "income", isIncome: true, linkKind: "take_home" }),
      ],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => [r.id, r.linkedRowId, r.notSet ?? false])).toEqual([
      [LINKED_TAKE_HOME_ID, "a", false],
      [`${LINKED_TAKE_HOME_ID}:b`, "b", true],
    ]);
    expect(shadowedRowIds).toEqual(["a", "b"]);
    expect(selectBudgetTotals(rows)).toEqual(figureUnknown(["annualSalary"], "not-set"));
  });

  it("marks a second housing link Not set too", () => {
    const { rows } = withLinkedBudgetRows(
      [
        row({ id: "a", category: "housing", linkKind: "housing" }),
        row({ id: "b", category: "housing", linkKind: "housing" }),
      ],
      { takeHome: noTakeHome, housing: rent(1000) },
    );
    expect(rows.map((r) => [r.linkedRowId, r.amount, r.notSet ?? false])).toEqual([
      ["a", 1000, false],
      ["b", 0, true],
    ]);
  });
});

describe("budgetEntryFromRow: link kinds", () => {
  it("keeps a stored link kind and drops anything else", () => {
    expect(budgetEntryFromRow({ id: "a", linkKind: "take_home" }).linkKind).toBe("take_home");
    expect(budgetEntryFromRow({ id: "b", linkKind: "housing" }).linkKind).toBe("housing");
    expect(budgetEntryFromRow({ id: "c", linkKind: "take-home" }).linkKind).toBeUndefined();
  });
});
