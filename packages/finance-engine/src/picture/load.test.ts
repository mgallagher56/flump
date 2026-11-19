import { describe, expect, it, vi } from "vitest";
import { DEFAULT_NET_WORTH_BASIS, netWorthBasisFromProfile } from "../net-worth-basis.js";
import { isFigureKnown } from "./figure.js";
import { type ProfileFacts, profileFactsFromProfile } from "./input.js";
import { loadFinancialPicture, type PictureRowSource, profileFromFacts } from "./load.js";

const AS_OF = new Date("2026-11-15T12:00:00Z");

function memorySource(): PictureRowSource & { calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  const hit = (k: string) => {
    calls[k] = (calls[k] ?? 0) + 1;
  };
  return {
    calls,
    async profile() {
      hit("profile");
      return { annualSalary: 36000, pensionPercent: 5, netWorthCountsProperty: false };
    },
    async accounts() {
      hit("accounts");
      return [
        { id: "cur", name: "Current", type: "Current", balance: 6000 },
        { id: "home", name: "Home", type: "Property", balance: 300000 },
        { id: "card", name: "Card", type: "Credit Card", balance: -1000, interestRate: 20 },
      ];
    },
    async accountDetails() {
      hit("accountDetails");
      return [{ accountId: "cur", year: 2026, month: 10, value: 5000 }];
    },
    async budgetEntries() {
      hit("budgetEntries");
      return [
        { category: "income", name: "Pay", amount: 2500, isIncome: true },
        { category: "housing", name: "Rent", amount: 900, isEssential: true },
      ];
    },
    async taxRecords() {
      hit("taxRecords");
      return [];
    },
  };
}

describe("loadFinancialPicture", () => {
  it("calls every source method once and builds the picture from what they return", async () => {
    const source = memorySource();
    const loaded = await loadFinancialPicture(source, { asOf: AS_OF });
    expect(source.calls).toEqual({
      profile: 1,
      accounts: 1,
      accountDetails: 1,
      budgetEntries: 1,
      taxRecords: 1,
    });
    // Rows reach the picture. Net worth leaves the home out (countProperty false):
    // 6,000 cash - 1,000 card = 5,000. Left over 2,500 - 900 = 1,600. The card has no stored
    // minimum, so it is estimated at max(25, 2.5% x 1,000) = 25: cover 6,000 / (900 + 25) =
    // 6.486..., shown as 6.5 months.
    expect(loaded.picture.netWorth.netWorth).toBe(5000);
    expect(loaded.picture.debt.consumerDebt).toBe(1000);
    const budget = loaded.picture.budget;
    if (!isFigureKnown(budget)) throw new Error("expected known");
    expect(budget.value.surplus).toBe(1600);
    const cover = loaded.picture.monthsOfCover;
    if (!isFigureKnown(cover)) throw new Error("expected known");
    expect(cover.value.months).toBe(6.5);
    // 36,000 x 5 / 100 / 12 = 150.
    expect(loaded.picture.pensionContributionMonthly).toBe(150);
    expect(loaded.rows.accountDetails).toHaveLength(1);
    expect(loaded.asOf).toBe(AS_OF);
    // 15 November 2026 is in the 2026/27 tax year (6 April 2026 to 5 April 2027).
    expect(loaded.taxYear).toBe("2026/27");
    expect(loaded.snapshot.getTotalLiquidCash()).toBe(6000);
  });

  it("propagates a source failure rather than building a partial picture", async () => {
    const source = memorySource();
    source.taxRecords = vi.fn().mockRejectedValue(new Error("db down"));
    await expect(loadFinancialPicture(source, { asOf: AS_OF })).rejects.toThrow("db down");
  });

  it("treats a missing profile as no profile", async () => {
    const source = memorySource();
    source.profile = async () => null;
    const loaded = await loadFinancialPicture(source, { asOf: AS_OF });
    expect(loaded.rows.profile).toBeNull();
    expect(loaded.input.netWorthBasis).toEqual(DEFAULT_NET_WORTH_BASIS);
  });
});

describe("profileFromFacts", () => {
  it("maps back to the same facts and basis", () => {
    const facts: ProfileFacts = {
      annualSalary: 52000,
      employmentType: "employed",
      taxRegion: "SCOTLAND",
      studentLoanPlans: ["PLAN_2"],
      pensionPercent: 5,
      isSalarySacrifice: true,
      monthlyTakeHome: null,
      housingStatus: "mortgage",
      monthlyHousingCost: 1100,
      mortgageType: "repayment",
      propertyOwnershipShare: null,
    };
    const basis = { countProperty: false, countStudentLoan: true };
    const profile = profileFromFacts(facts, basis);
    expect(profileFactsFromProfile(profile)).toEqual(facts);
    expect(netWorthBasisFromProfile(profile)).toEqual(basis);
  });

  it("keeps unanswered facts unanswered", () => {
    const facts = profileFactsFromProfile(null);
    expect(profileFactsFromProfile(profileFromFacts(facts))).toEqual(facts);
  });
});
