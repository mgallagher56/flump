import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";
import type { ProfileFacts } from "../input.js";
import {
  fixedRateEnd,
  rentAtShare,
  selectHousingCost,
  selectHousingPayment,
} from "./housing-cost.js";
import type { TakeHome } from "./take-home.js";

// Edge cases of the housing figure: unreadable saved amounts, a saved £0 payment, accounts with
// no id, a payment the formula cannot work out, which budget line carries a rent's share, and
// how an unknown take-home passes its reason on.

const facts = (over: Partial<ProfileFacts> = {}): ProfileFacts => ({
  annualSalary: 40000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
  housingStatus: null,
  monthlyHousingCost: null,
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
  balance: 200000,
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

const payment = (
  profile: ProfileFacts,
  accounts: RawAccount[] = [],
  budget: BudgetEntryItem[] = [],
) => selectHousingPayment(profile, new PortfolioSnapshot(accounts), accounts, budget);

const cost = (
  profile: ProfileFacts,
  th: Figure<TakeHome>,
  accounts: RawAccount[] = [],
  budget: BudgetEntryItem[] = [],
) => selectHousingCost(profile, th, new PortfolioSnapshot(accounts), accounts, budget);

describe("a saved housing amount that is not a real figure", () => {
  it("treats an infinite saved rent as not saved", () => {
    expect(payment(facts({ housingStatus: "renting", monthlyHousingCost: Infinity }))).toBeNull();
    expect(
      cost(facts({ housingStatus: "renting", monthlyHousingCost: Infinity }), takeHome(2000)),
    ).toEqual(figureUnknown(["monthlyHousingCost"], "not-set"));
  });

  it("treats a saved rent of £0 or below as not saved", () => {
    for (const monthlyHousingCost of [0, -1]) {
      expect(payment(facts({ housingStatus: "renting", monthlyHousingCost }))).toBeNull();
    }
  });

  it("stays not saved when the rent is missing, even with a shared rent line", () => {
    // No rent saved: a joint rent line has nothing to take a share of, so the payment is unknown,
    // never a share of £0.
    const shared = [
      row({
        id: "rent",
        category: "housing",
        linkKind: "housing",
        ownership: "joint",
        sharePercent: 50,
      }),
    ];
    expect(payment(facts({ housingStatus: "renting" }), [], shared)).toBeNull();
    expect(cost(facts({ housingStatus: "renting" }), takeHome(2000), [], shared)).toEqual(
      figureUnknown(["monthlyHousingCost"], "not-set"),
    );
  });
});

describe("the payment saved on a mortgage account", () => {
  it("estimates the payment when the saved payment is £0", () => {
    // A saved £0 is not a payment: the estimate is used instead.
    // 200,000 at 4.5% over 300 months: r = 0.045 / 12 = 0.00375, (1.00375)^300 = 3.073742528,
    // payment per pound = 0.00375 x 3.073742528 / 2.073742528 = 0.00555832478,
    // 200,000 x 0.00555832478 = 1,111.66.
    expect(
      payment(facts({ housingStatus: "mortgage" }), [mortgage({ monthlyContribution: 0 })]),
    ).toEqual({ kind: "mortgage", monthly: 1111.66, paymentEstimated: true });
  });

  it("uses the profile figure for a mortgage account with no id", () => {
    // No id: no saved payment and no balance can be read for it, so it cannot be estimated and
    // the profile's £900 is the figure.
    expect(
      payment(facts({ housingStatus: "mortgage", monthlyHousingCost: 900 }), [
        mortgage({ id: undefined }),
      ]),
    ).toEqual({ kind: "mortgage", monthly: 900, paymentEstimated: false });
  });

  it("uses the profile figure when a second mortgage's payment cannot be worked out", () => {
    // The second mortgage's rate is so small that (1 + r)^n is exactly 1 in floating point, so
    // the repayment formula divides by zero and gives no payment. The whole figure falls back to
    // the profile's £1,250, never the first account's £1,000 alone.
    expect(
      payment(facts({ housingStatus: "mortgage", monthlyHousingCost: 1250 }), [
        mortgage({ monthlyContribution: 1000 }),
        mortgage({ id: "m2", balance: 20000, interestRate: 1e-300, termMonths: 60 }),
      ]),
    ).toEqual({ kind: "mortgage", monthly: 1250, paymentEstimated: false });
  });
});

describe("rentAtShare: only the linked housing line carries a rent's share", () => {
  const linked = (over: Partial<BudgetEntryItem> = {}) =>
    row({ id: "rent", category: "housing", name: "Rent", linkKind: "housing", ...over });

  it("takes the linked line's share when it is joint", () => {
    // £1,500 at 50% = £750.
    expect(rentAtShare(1500, [linked({ ownership: "joint", sharePercent: 50 })])).toBe(750);
  });

  it("ignores a joint row that is not linked to housing, ahead of a sole linked line", () => {
    const budget = [
      row({ id: "bills", ownership: "joint", sharePercent: 50 }),
      row({ id: "insurance", category: "housing", ownership: "joint", sharePercent: 50 }),
      linked(),
    ];
    // The linked line is sole: the whole £1,500.
    expect(rentAtShare(1500, budget)).toBe(1500);
  });

  it("ignores an income row linked to housing", () => {
    const budget = [linked({ isIncome: true, ownership: "joint", sharePercent: 50 })];
    expect(rentAtShare(1500, budget)).toBe(1500);
  });

  it("ignores a line linked to housing outside the housing category", () => {
    const budget = [linked({ category: "bills", ownership: "joint", sharePercent: 50 })];
    expect(rentAtShare(1500, budget)).toBe(1500);
  });
});

describe("selectHousingCost: how an unknown take-home passes on", () => {
  const renter = facts({ housingStatus: "renting", monthlyHousingCost: 900 });

  it("keeps take-home's own reason", () => {
    expect(cost(renter, figureUnknown<TakeHome>([], "unsupported-year"))).toEqual(
      figureUnknown([], "unsupported-year"),
    );
  });

  it("reads not set when take-home gives no reason", () => {
    expect(cost(renter, figureUnknown<TakeHome>(["annualSalary"]))).toEqual(
      figureUnknown(["annualSalary"], "not-set"),
    );
  });

  it("names a fact missing from both sides once", () => {
    // No rent saved, and take-home also reports the rent as missing: it is listed once.
    expect(
      cost(
        facts({ housingStatus: "renting" }),
        figureUnknown<TakeHome>(["monthlyHousingCost", "annualSalary"], "not-set"),
      ),
    ).toEqual(figureUnknown(["monthlyHousingCost", "annualSalary"], "not-set"));
  });

  it("names the salary as missing when take-home is £0 or below", () => {
    for (const monthly of [0, -100]) {
      expect(cost(renter, takeHome(monthly))).toEqual(figureUnknown(["annualSalary"], "not-set"));
    }
  });
});

describe("fixedRateEnd: a stored date must be exactly YYYY-MM-DD", () => {
  const asOf = new Date("2026-11-14T12:00:00Z");

  it("is null for a date with anything before it", () => {
    for (const bad of ["x2027-05-14", "02027-05-14"]) {
      expect(fixedRateEnd(bad, asOf)).toBeNull();
    }
  });

  it("is null for a date with anything after it", () => {
    for (const bad of ["2027-05-14x", "2027-05-14T00:00:00Z"]) {
      expect(fixedRateEnd(bad, asOf)).toBeNull();
    }
  });

  it("is null for a year below 100, which a UTC date would read as 19xx", () => {
    // Date.UTC(50, 5, 15) is 15 June 1950, so the stored year 0050 does not round-trip.
    expect(fixedRateEnd("0050-06-15", asOf)).toBeNull();
  });
});
