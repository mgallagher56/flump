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

  it("counts only the person's own pay when they have an income row, and offers the take-home", () => {
    // Salary saved (take-home £2,500) and a "Paycheck" row of £2,000. Only the £2,000 counts:
    // income = 2,000, not 2,000 + 2,500 = 4,500. The take-home is offered, not counted.
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [row({ id: "p", category: "income", name: "Paycheck", amount: 2000, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual(["p"]);
    expect(shadowedRowIds).toEqual([]);
    expect(totalsOf(rows).income).toBe(2000);
    expect(offers).toEqual([
      { link: "take_home", monthly: 2500, kind: null, paymentEstimated: false, rowIds: ["p"] },
    ]);
  });

  it("does not let Child Benefit stand in for the salary: the take-home is offered", () => {
    // "Child benefit" £100 is the only income row; take-home £2,500 saved. Income = 100 (the
    // salary is not in the budget yet), and the offer says so with the row it could replace.
    const { rows, offers } = withLinkedBudgetRows(
      [row({ id: "cb", category: "income", name: "Child benefit", amount: 100, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual(["cb"]);
    expect(totalsOf(rows).income).toBe(100);
    expect(offers.map((o) => [o.link, o.monthly, o.rowIds])).toEqual([["take_home", 2500, ["cb"]]]);
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

  it("offers the take-home beside a £0 income row, adding nothing on its own", () => {
    // A £0 "Salary" row is still a row of the person's: nothing is added. Income = 0; offered.
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [row({ id: "s", category: "income", name: "Salary", amount: 0, isIncome: true })],
      { takeHome: takeHome(2500), housing: null },
    );
    expect(rows.map((r) => r.id)).toEqual(["s"]);
    expect(shadowedRowIds).toEqual([]);
    expect(totalsOf(rows).income).toBe(0);
    expect(offers.map((o) => o.rowIds)).toEqual([["s"]]);
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
  it("a sole renter: £1,200 saved is £1,200 in the budget once the row is linked", () => {
    // Saved rent £1,200, the person's own cost. The "Rent" row is linked (stored £0, sole).
    // Essentials = 1,200.
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [row({ id: "h", category: "housing", name: "Rent", amount: 0, linkKind: "housing" })],
      { takeHome: noTakeHome, housing: rent(1200) },
    );
    expect(rows.map((r) => r.id)).toEqual([LINKED_HOUSING_ID]);
    expect(rows[0]).toMatchObject({
      name: "Rent",
      amount: 1200,
      ownership: "sole",
      linkedRowId: "h",
    });
    expect(shadowedRowIds).toEqual(["h"]);
    expect(offers).toEqual([]);
    expect(totalsOf(rows).essentials).toBe(1200);
  });

  it("a 50% joint renter who saved their own £600: £600 counts, not £300", () => {
    // The saved figure is asked for as the person's own cost ("Your own share if you split it"),
    // so it is £600 already. The linked row is joint at 50%, but no second share is taken:
    // essentials = 600 (not 600 x 50% = 300).
    const { rows } = withLinkedBudgetRows(
      [
        row({
          id: "h",
          category: "housing",
          name: "Rent",
          amount: 0,
          ownership: "joint",
          sharePercent: 50,
          linkKind: "housing",
        }),
      ],
      { takeHome: noTakeHome, housing: rent(600) },
    );
    expect(rows[0]).toMatchObject({ id: LINKED_HOUSING_ID, ownership: "sole", sharePercent: null });
    expect(totalsOf(rows).essentials).toBe(600);
  });

  it("a joint mortgage at 50%: the payment at the person's share, with no second share", () => {
    // Estimate £1,234.56, worked out from the share-scaled balance (50% of the loan), so already
    // the person's share. The linked row is joint at 50%: essentials = 300 + 1,234.56 = 1,534.56,
    // not 300 + 617.28.
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
          linkKind: "housing",
        }),
      ],
      {
        takeHome: noTakeHome,
        housing: { kind: "mortgage", monthly: 1234.56, paymentEstimated: true },
      },
    );
    expect(rows.map((r) => r.id)).toEqual(["g", LINKED_HOUSING_ID]);
    expect(rows[1]).toMatchObject({ ownership: "sole", sharePercent: null });
    expect(shadowedRowIds).toEqual(["m"]);
    expect(totalsOf(rows).essentials).toBeCloseTo(1534.56, 2);
  });

  it("does not fill a single empty housing row: the rent is offered, not counted", () => {
    // Saved rent £950; one £0 housing row, not linked. Nothing changes until the person picks:
    // essentials = 0, and the offer lists that row.
    const { rows, shadowedRowIds, offers } = withLinkedBudgetRows(
      [row({ id: "h", category: "housing", name: "Rent or mortgage", amount: 0 })],
      { takeHome: noTakeHome, housing: rent(950) },
    );
    expect(rows.map((r) => r.id)).toEqual(["h"]);
    expect(shadowedRowIds).toEqual([]);
    expect(totalsOf(rows).essentials).toBe(0);
    expect(offers).toEqual([
      { link: "housing", monthly: 950, kind: "rent", paymentEstimated: false, rowIds: ["h"] },
    ]);
  });

  it("does not let Home insurance stand in for the rent: the rent is offered", () => {
    // Saved rent £1,000; the one housing row is "Home insurance" £30. Essentials = 30 (the rent
    // is not in the budget yet), and the rent is offered.
    const { rows, offers } = withLinkedBudgetRows(
      [row({ id: "hi", category: "housing", name: "Home insurance", amount: 30 })],
      { takeHome: noTakeHome, housing: rent(1000) },
    );
    expect(rows.map((r) => r.id)).toEqual(["hi"]);
    expect(totalsOf(rows).essentials).toBe(30);
    expect(offers.map((o) => [o.link, o.monthly, o.kind, o.rowIds])).toEqual([
      ["housing", 1000, "rent", ["hi"]],
    ]);
  });

  it("two housing rows: changes nothing and offers the saved payment", () => {
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
      {
        link: "housing",
        monthly: 950,
        kind: "mortgage",
        paymentEstimated: false,
        rowIds: ["m", "sc"],
      },
    ]);
  });

  it("two housing rows, one chosen: the saved figure stands in for it at 100%", () => {
    // "Mortgage" chosen (stored £0, joint 50%, linkKind housing) and "Service charge" £80.
    // The saved £950 is the person's own cost: essentials = 950 + 80 = 1,030.
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
    expect(totalsOf(rows).essentials).toBe(1030);
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

  it("offers the mortgage estimate beside a typed row instead of dropping it silently", () => {
    // Estimate £1,234.56. Typed "Mortgage" £600, joint at 50%: it counts 600 x 50% = 300.
    // The estimate is not counted (essentials = 300) but is offered, marked as an estimate.
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
    expect(offers).toEqual([
      {
        link: "housing",
        monthly: 1234.56,
        kind: "mortgage",
        paymentEstimated: true,
        rowIds: ["m"],
      },
    ]);
    expect(totalsOf(rows).essentials).toBe(300);
  });

  it("keeps the budget's own housing row while no housing payment is saved", () => {
    const budget = [row({ id: "rent", category: "housing", name: "Rent", amount: 900 })];
    expect(withLinkedBudgetRows(budget, { takeHome: noTakeHome, housing: null }).rows).toEqual(
      budget,
    );
  });
});

describe("withLinkedBudgetRows: a saved £0 is a real £0 (item 3)", () => {
  const household0 = { kind: "household" as const, monthly: 0, paymentEstimated: false };
  const food = row({ id: "food", category: "expenses", name: "Food", amount: 300 });

  it("resolves a linked line to a household contribution of £0, never Not set", () => {
    // Living with family, paying £0 saved. The linked row reads £0: essentials = 0 + 300 = 300,
    // and the totals stay known (so Breathing room stays known).
    const { rows } = withLinkedBudgetRows(
      [row({ id: "h", category: "housing", name: "Board", linkKind: "housing" }), food],
      { takeHome: noTakeHome, housing: household0 },
    );
    expect(rows[0]).toMatchObject({ id: LINKED_HOUSING_ID, amount: 0, linkedRowId: "h" });
    expect(rows[0]?.notSet).toBeUndefined();
    expect(totalsOf(rows).essentials).toBe(300);
  });

  it("adds a £0 household line when there are no housing rows, and offers nothing beside one", () => {
    const added = withLinkedBudgetRows([food], { takeHome: noTakeHome, housing: household0 });
    expect(added.rows.map((r) => [r.id, r.amount])).toEqual([
      ["food", 300],
      [LINKED_HOUSING_ID, 0],
    ]);
    // A £0 left out changes no figure, so beside a housing row it is not offered.
    const beside = withLinkedBudgetRows(
      [row({ id: "hi", category: "housing", name: "Home insurance", amount: 20 })],
      { takeHome: noTakeHome, housing: household0 },
    );
    expect(beside.offers).toEqual([]);
  });

  it("builds Breathing room from a saved £0 household contribution", () => {
    // Living with family at £0; "Board" linked; Food £300 essential; cash £900.
    // Essentials = 0 + 300 = 300. Months of cover = 900 / 300 = 3.
    const picture = buildFinancialPicture(
      financialPictureInputFromRows({
        profile: { housingStatus: "living_with_family", monthlyHousingCost: 0 },
        accounts: [{ id: "cur", name: "Current", type: "Current", balance: 900 }],
        budgetEntries: [
          {
            id: "h",
            category: "housing",
            name: "Board",
            amount: 0,
            isEssential: true,
            linkKind: "housing",
          },
          { id: "f", category: "expenses", name: "Food", amount: 300, isEssential: true },
        ],
      }),
    );
    if (!isFigureKnown(picture.monthsOfCover)) throw new Error("expected known");
    expect(picture.monthsOfCover.value.months).toBe(3);
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
    // Renting at £800 saved; budget has a "Rent" row linked to it (£0 stored) and Groceries £300
    // (essential). Essentials = 800 + 300 = 1,100. Cash £3,300 / 1,100 = 3.0.
    const picture = buildFinancialPicture(
      financialPictureInputFromRows({
        profile: { housingStatus: "renting", monthlyHousingCost: 800 },
        accounts: [{ id: "cur", name: "Current", type: "Current", balance: 3300 }],
        budgetEntries: [
          {
            id: "rent",
            category: "housing",
            name: "Rent",
            amount: 0,
            isEssential: true,
            linkKind: "housing",
          },
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
    ).toEqual({ kind: "mortgage", monthly: 4303.32, paymentEstimated: true });
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

  it("marks a linked housing line Not set when no housing payment is saved, keeping its name", () => {
    const { rows } = withLinkedBudgetRows([rentRow, food], { takeHome: noTakeHome, housing: null });
    expect(rows[0]).toMatchObject({
      id: LINKED_HOUSING_ID,
      name: "Our rent",
      linked: "housing",
      linkedRowId: "rent",
      notSet: true,
    });
    expect(selectBudgetTotals(rows)).toEqual(figureUnknown(["monthlyHousingCost"], "not-set"));
  });

  it("resolves a joint linked rent at 100%: the saved rent is the person's own cost", () => {
    // Rent £1,000 saved as the person's own cost, the row joint at 50%: £1,000 counts.
    // Essentials = 1,000 + 300 = 1,300.
    const { rows } = withLinkedBudgetRows([rentRow, food], {
      takeHome: noTakeHome,
      housing: rent(1000),
    });
    expect(rows[0]).toMatchObject({ amount: 1000, linkedRowId: "rent", ownership: "sole" });
    expect(rows[0]?.notSet).toBeUndefined();
    expect(totalsOf(rows).essentials).toBe(1300);
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
    // No income rows, take-home £2,500: "Take-home pay" is added. Saved rent £1,000 reads into the
    // linked housing row, shown under the caller's name for it ("Bills 1"). Income 2,500, housing 1,000.
    const entries = [
      row({
        id: "h",
        name: "Landlord J Smith",
        category: "housing",
        amount: 0,
        linkKind: "housing",
      }),
    ];
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

describe("withLinkedBudgetRows: the housing line with a buy-to-let mortgage (system audit slice 4)", () => {
  it("still resolves to the home's payment, £1,033.85", () => {
    // Residential 186,000 at 4.5% over 300 months = £1,033.85 (worked in housing-cost.test.ts).
    // A buy-to-let mortgage with no term saved used to make the estimate unknown, so the linked
    // line had nothing to show.
    const accounts = [
      {
        id: "m1",
        name: "Home mortgage",
        type: "Mortgage",
        accountSubtype: "residential_mortgage",
        balance: 186000,
        interestRate: 4.5,
        termMonths: 300,
      },
      {
        id: "b1",
        name: "Buy-to-let mortgage",
        type: "Mortgage",
        accountSubtype: "btl_mortgage",
        balance: 150000,
        interestRate: 5,
        termMonths: null,
      },
    ];
    const housing = selectHousingPayment(
      { ...emptyProfile, housingStatus: "mortgage" },
      new PortfolioSnapshot(accounts, []),
      accounts,
    );
    const { rows } = withLinkedBudgetRows(
      [row({ id: "h", category: "housing", name: "Mortgage", amount: 0, linkKind: "housing" })],
      { takeHome: noTakeHome, housing },
    );
    expect(rows[0]).toMatchObject({ id: LINKED_HOUSING_ID, amount: 1033.85 });
  });
});
