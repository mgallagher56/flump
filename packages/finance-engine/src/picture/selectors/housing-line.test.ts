import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { buildFinancialPicture, financialPictureInputFromRows } from "../build.js";
import { type Figure, figureKnown, isFigureKnown } from "../figure.js";
import type { ProfileFacts } from "../input.js";
import { essentialCommitments } from "./commitments.js";
import { selectHousingCost, selectHousingPayment } from "./housing-cost.js";
import { withLinkedBudgetRows } from "./linked-budget-rows.js";
import type { TakeHome } from "./take-home.js";

// Audit slice 5, the housing line: one housing figure for the budget's linked line, commitments
// and Retirement (links L13, L14, L57; findings HM-1, HM-2, BU-4, BU-5, JO-8).

const facts = (over: Partial<ProfileFacts> = {}): ProfileFacts => ({
  annualSalary: 40000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
  housingStatus: null,
  monthlyHousingCost: null,
  mortgageType: null,
  ...over,
});

const takeHome = (monthly: number): Figure<TakeHome> =>
  figureKnown<TakeHome>({
    monthly,
    annual: monthly * 12,
    incomeTax: 0,
    nationalInsurance: 0,
    studentLoan: 0,
    pension: 0,
    taxYear: "2026/27",
    region: "ENGLAND_NI_WALES",
  });

const mortgage = (over: Partial<RawAccount> = {}): RawAccount => ({
  id: "m1",
  name: "Home mortgage",
  type: "Mortgage",
  balance: -200000,
  interestRate: 4.5,
  termMonths: 300,
  ...over,
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

/** The rent line the person linked to the saved rent (stored amount £0, never read). */
const rentLine = (over: Partial<BudgetEntryItem> = {}) =>
  row({ id: "rent", category: "housing", name: "Rent", linkKind: "housing", ...over });

const payment = (
  profile: ProfileFacts,
  accounts: RawAccount[] = [],
  budget: BudgetEntryItem[] = [],
) => selectHousingPayment(profile, new PortfolioSnapshot(accounts), accounts, budget);

describe("the mortgage payment saved on the mortgage account (L13, HM-1, BU-5)", () => {
  it("is the housing payment, ahead of the estimate and the profile figure", () => {
    // Saved payment £1,400 on the account; the profile still holds the onboarding £1,250.
    expect(
      payment(facts({ housingStatus: "mortgage", monthlyHousingCost: 1250 }), [
        mortgage({ monthlyContribution: 1400 }),
      ]),
    ).toEqual({ kind: "mortgage", monthly: 1400, paymentEstimated: false });
  });

  it("counts a joint mortgage's saved payment at the person's share", () => {
    // £1,400 at 50% = £700.
    expect(
      payment(facts({ housingStatus: "mortgage" }), [
        mortgage({ monthlyContribution: 1400, ownership: "joint", sharePercent: 50 }),
      ])?.monthly,
    ).toBe(700);
  });

  it("estimates a mortgage with no saved payment, as before", () => {
    // 200,000 at 4.5% over 300 months: r = 0.00375, 200,000 x r / (1 - (1 + r)^-300) = 1,111.66.
    expect(
      payment(facts({ housingStatus: "mortgage", monthlyHousingCost: 1250 }), [mortgage()]),
    ).toEqual({ kind: "mortgage", monthly: 1111.66, paymentEstimated: true });
  });

  it("counts a saved payment on an interest-only mortgage, and never estimates one", () => {
    const interestOnly = facts({
      housingStatus: "mortgage",
      monthlyHousingCost: 750,
      mortgageType: "interest-only",
    });
    expect(payment(interestOnly, [mortgage({ monthlyContribution: 700 })])?.monthly).toBe(700);
    // No saved payment: a repayment estimate would be wrong, so the profile's £750 is used.
    expect(payment(interestOnly, [mortgage()])).toEqual({
      kind: "mortgage",
      monthly: 750,
      paymentEstimated: false,
    });
  });

  it("falls back to the profile figure when one mortgage can be neither read nor estimated", () => {
    // The second mortgage has no saved payment and no rate: the whole figure is the profile's £1,250.
    expect(
      payment(facts({ housingStatus: "mortgage", monthlyHousingCost: 1250 }), [
        mortgage({ monthlyContribution: 1000 }),
        mortgage({ id: "m2", interestRate: null }),
      ])?.monthly,
    ).toBe(1250);
  });

  it("adds a saved payment and an estimate when there are two mortgages on the home", () => {
    // A second mortgage with no saved payment: £1,000 saved plus that one's estimate.
    const second = mortgage({ id: "m2", balance: -20000, interestRate: 6, termMonths: 60 });
    const fig = payment(facts({ housingStatus: "mortgage" }), [
      mortgage({ monthlyContribution: 1000 }),
      second,
    ]);
    // 20,000 at 6% over 60 months: r = 0.005, 20,000 x 0.005 / (1 - 1.005^-60) = 386.66.
    expect(fig?.monthly).toBe(1386.66);
    expect(fig?.paymentEstimated).toBe(true);
  });

  it("leaves out a buy-to-let mortgage's saved payment", () => {
    expect(
      payment(facts({ housingStatus: "mortgage", monthlyHousingCost: 1250 }), [
        mortgage({ monthlyContribution: 1400 }),
        mortgage({ id: "btl", accountSubtype: "btl_mortgage", monthlyContribution: 600 }),
      ])?.monthly,
    ).toBe(1400);
  });
});

describe("a shared rent counts at its share (L57, JO-8)", () => {
  const renter = facts({ housingStatus: "renting", monthlyHousingCost: 1500 });

  it("is the whole saved rent while the rent line is sole", () => {
    expect(payment(renter, [], [rentLine()])?.monthly).toBe(1500);
    expect(payment(renter)?.monthly).toBe(1500);
  });

  it("is the person's share once the rent line is joint", () => {
    // £1,500 at 50% = £750.
    expect(payment(renter, [], [rentLine({ ownership: "joint", sharePercent: 50 })])?.monthly).toBe(
      750,
    );
    // A joint line with no share saved counts at 50%, as every joint entry does.
    expect(
      payment(renter, [], [rentLine({ ownership: "joint", sharePercent: null })])?.monthly,
    ).toBe(750);
  });

  it("applies the share once in the budget, commitments and the housing cost", () => {
    const budget = [
      rentLine({ ownership: "joint", sharePercent: 40 }),
      row({ id: "pay", category: "income", isIncome: true, amount: 2500 }),
    ];
    const snapshot = new PortfolioSnapshot([]);
    const housing = selectHousingPayment(renter, snapshot, [], budget);
    const { rows } = withLinkedBudgetRows(budget, {
      takeHome: takeHome(2500),
      housing,
      accounts: snapshot,
    });
    // £1,500 at 40% = £600, counted once: the line, the essentials and the housing cost agree.
    expect(rows.find((r) => r.linked === "housing")?.amount).toBe(600);
    expect(essentialCommitments(rows, snapshot).essentialsExcludingDebt).toBe(600);
    const cost = selectHousingCost(renter, takeHome(2500), snapshot, [], budget);
    if (!isFigureKnown(cost)) throw new Error("expected known");
    // 600 / 2,500 = 24.0%.
    expect(cost.value).toMatchObject({ monthly: 600, sharePct: 24 });
  });

  it("never halves a household contribution or a mortgage a second time", () => {
    // A household contribution is already what the person pays: £300 stays £300.
    expect(
      payment(
        facts({ housingStatus: "living_with_family", monthlyHousingCost: 300 }),
        [],
        [rentLine({ ownership: "joint", sharePercent: 50 })],
      )?.monthly,
    ).toBe(300);
    // The mortgage account's share is the one that counts: a joint line does not halve it again.
    expect(
      payment(
        facts({ housingStatus: "mortgage" }),
        [mortgage({ monthlyContribution: 1400, ownership: "joint", sharePercent: 50 })],
        [rentLine({ name: "Mortgage", ownership: "joint", sharePercent: 50 })],
      )?.monthly,
    ).toBe(700);
  });
});

describe("the picture reads one housing figure", () => {
  it("the linked line, safe to spend and the housing cost all follow the mortgage account", () => {
    // Take-home from a typed £3,000 income line; linked housing line; mortgage saved at £1,400.
    const picture = buildFinancialPicture(
      financialPictureInputFromRows({
        profile: { housingStatus: "mortgage", monthlyHousingCost: 1250 },
        accounts: [mortgage({ monthlyContribution: 1400 })],
        budgetEntries: [
          { id: "pay", category: "income", name: "Pay", amount: 3000, isIncome: true },
          { id: "home", category: "housing", name: "Mortgage", amount: 0, linkKind: "housing" },
        ],
      }),
      { asOf: new Date("2026-11-19T12:00:00Z") },
    );
    expect(picture.budgetRows.find((r) => r.linked === "housing")?.amount).toBe(1400);
    if (!isFigureKnown(picture.budget)) throw new Error("expected known budget");
    // 3,000 - 1,400 = 1,600 left over, and the same from safe to spend.
    expect(picture.budget.value.surplus).toBe(1600);
    if (!isFigureKnown(picture.safeToSpend)) throw new Error("expected known safe to spend");
    expect(picture.safeToSpend.value.monthly).toBe(1600);
  });
});
