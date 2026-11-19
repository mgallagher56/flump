import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "./ai-context-pack.js";
import type { RawAccount } from "./portfolio.js";
import {
  type BuildRetirementPlanInputArgs,
  buildRetirementPlanInput,
  type RetirementSavedPlanInput,
} from "./retirement-input.js";

// Born 1981, so 45 in 2026.
const NOW = new Date("2026-11-17T12:00:00Z");

const plan: RetirementSavedPlanInput = {
  retirementAge: 65,
  planToAge: 85,
  target: null,
  statePensionAge: null,
  statePensionAnnualForecastGbp: null,
  statePensionQualifyingYears: null,
};

function build(over: Partial<BuildRetirementPlanInputArgs>) {
  const built = buildRetirementPlanInput({
    plan,
    birthYear: 1981,
    now: NOW,
    accounts: [],
    ...over,
  });
  if (!built.ok) throw new Error("expected a built input");
  return built;
}

function accountById(accounts: RawAccount[], id: string) {
  const found = build({ accounts }).accounts.find((a) => a.id === id);
  if (!found) throw new Error(`expected account ${id}`);
  return found;
}

describe("buildRetirementPlanInput: account shares", () => {
  it("counts a pension in full even when it is marked joint, as pensions cannot be joint", () => {
    // The type alone says pension (the name does not), so the joint 50% is ignored: £10,000.
    const pension = accountById(
      [
        {
          id: "p",
          name: "Work scheme",
          type: "Pension",
          balance: 10_000,
          ownership: "joint",
          sharePercent: 50,
        },
      ],
      "p",
    );
    expect(pension.balanceGbp).toBe(10_000);
  });

  it("counts an ISA named as one in full even when it is marked joint", () => {
    // "Cash ISA" in the name makes it an ISA, which is individual only: £8,000, not £4,000.
    const isa = accountById(
      [
        {
          id: "i",
          name: "Cash ISA",
          type: "Saving",
          balance: 8000,
          ownership: "joint",
          sharePercent: 50,
        },
      ],
      "i",
    );
    expect(isa.balanceGbp).toBe(8000);
  });

  it("counts an account whose chosen subtype is an ISA in full even when it is marked joint", () => {
    // Subtype cash_isa decides it is an ISA: £6,000 in full.
    const isa = accountById(
      [
        {
          id: "s",
          name: "Rainy day",
          type: "Saving",
          accountSubtype: "cash_isa",
          balance: 6000,
          ownership: "joint",
          sharePercent: 50,
        },
      ],
      "s",
    );
    expect(isa.balanceGbp).toBe(6000);
  });

  it("applies a joint share other than 50%", () => {
    // £1,000 at 25% = £250; £200 a month at 25% = £50.
    const saver = accountById(
      [
        {
          id: "j",
          name: "Joint saver",
          type: "Saving",
          balance: 1000,
          monthlyContribution: 200,
          ownership: "joint",
          sharePercent: 25,
        },
      ],
      "j",
    );
    expect(saver.balanceGbp).toBe(250);
    expect(saver.monthlyContributionGbp).toBe(50);
  });
});

describe("buildRetirementPlanInput: mapped accounts", () => {
  it("leaves out an account with no id", () => {
    const built = build({
      accounts: [
        { id: "a", name: "Saver", type: "Saving", balance: 100 },
        { name: "No id", type: "Saving", balance: 500 },
      ],
    });
    expect(built.accounts.map((a) => a.id)).toEqual(["a"]);
  });

  it("keeps the saved name, and gives an unnamed account an empty name", () => {
    const built = build({
      accounts: [
        { id: "named", name: "Work pension", type: "Pension", balance: 100 },
        { id: "unnamed", type: "Pension", balance: 100 },
      ],
    });
    expect(built.accounts.map((a) => a.name)).toEqual(["Work pension", ""]);
  });

  it("has no monthly contribution when none is saved, rather than £0", () => {
    const saver = accountById([{ id: "a", name: "Saver", type: "Saving", balance: 100 }], "a");
    expect(saver.monthlyContributionGbp).toBeNull();
  });

  it("treats a blank monthly contribution or rate as not saved, rather than £0 or 0%", () => {
    const saver = accountById(
      [
        {
          id: "a",
          name: "Saver",
          type: "Saving",
          balance: 100,
          monthlyContribution: "",
          interestRate: "",
        },
      ],
      "a",
    );
    expect(saver.monthlyContributionGbp).toBeNull();
    expect(saver.interestRatePct).toBeNull();
  });
});

describe("buildRetirementPlanInput: countable accounts", () => {
  it("lists pensions and untyped accounts with their name, type and share, never a current account", () => {
    const built = build({
      accounts: [
        { id: "cur", name: "Everyday", type: "Current", balance: 2000 },
        { id: "pen", name: "Work pension", type: "Pension", balance: 50_000 },
        { id: "bonds", name: "Premium bonds", balance: 1000 },
      ],
    });
    expect(built.countableAccounts.map((a) => a.id)).toEqual(["pen", "bonds"]);
    expect(built.countableAccounts[0]).toEqual({
      id: "pen",
      name: "Work pension",
      type: "Pension",
      balanceGbp: 50_000,
      counts: true,
    });
    // No saved type: listed with an empty type, not a made-up one.
    expect(built.countableAccounts[1]).toEqual(
      expect.objectContaining({ id: "bonds", name: "Premium bonds", type: "", balanceGbp: 1000 }),
    );
  });
});

describe("buildRetirementPlanInput: home mortgage details", () => {
  const mortgage = (over: Partial<RawAccount>): RawAccount => ({
    id: "mtg",
    name: "Home loan",
    type: "Mortgage",
    balance: -200_000,
    termMonths: 300,
    ...over,
  });
  const mortgageOf = (accounts: RawAccount[]) => build({ accounts }).input.housing?.mortgage;

  it("has no mortgage when no account is a mortgage, whatever the first account is", () => {
    expect(
      mortgageOf([
        { id: "pen", name: "Work pension", type: "Pension", balance: 1000, interestRate: 5 },
      ]),
    ).toBeNull();
  });

  it("cannot cost a mortgage with no saved rate and no saved payment", () => {
    expect(mortgageOf([mortgage({})])).toBeNull();
  });

  it("cannot cost a mortgage with no saved rate and a £0 payment", () => {
    expect(mortgageOf([mortgage({ monthlyContribution: 0 })])).toBeNull();
  });

  it("costs a mortgage from its payment when no rate is saved", () => {
    // Sole: the £200,000 owed (sign dropped) and the £950 payment in full.
    expect(mortgageOf([mortgage({ monthlyContribution: 950 })])).toEqual({
      balanceGbp: 200_000,
      interestRateApr: null,
      remainingTermMonths: 300,
      monthlyPaymentGbp: 950,
    });
  });

  it("costs a mortgage from its rate when no payment is saved, with no payment made up", () => {
    expect(mortgageOf([mortgage({ interestRate: 4.5 })])).toEqual({
      balanceGbp: 200_000,
      interestRateApr: 4.5,
      remainingTermMonths: 300,
      monthlyPaymentGbp: null,
    });
  });
});

describe("buildRetirementPlanInput: housing status and saved housing cost", () => {
  const rentLine: BudgetEntryItem = {
    id: "rent",
    category: "housing",
    name: "Rent",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isEssential: true,
    linkKind: "housing",
    ownership: "joint",
    sharePercent: 50,
  };

  it("reads a saved status in any case and with spaces", () => {
    const built = build({ housingStatus: "  Renting " });
    expect(built.input.housing?.housingStatus).toBe("renting");
  });

  it("passes a mortgage holder's saved figure as it is, never at the rent line's share", () => {
    // Only a rent is shared by the rent line: £1,200 stays £1,200.
    const built = build({
      housingStatus: "mortgage",
      monthlyHousingCostGbp: 1200,
      budgetEntries: [rentLine],
    });
    expect(built.input.housing?.monthlyHousingCostGbp).toBe(1200);
  });

  it("has no housing cost for a renter with no saved rent, even with a shared rent line", () => {
    const built = build({
      housingStatus: "renting",
      monthlyHousingCostGbp: null,
      budgetEntries: [rentLine],
    });
    expect(built.input.housing?.monthlyHousingCostGbp).toBeNull();
  });
});
