import { describe, expect, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot } from "../../portfolio.js";
import { buildFinancialPicture } from "../build.js";
import { figureKnown, figureUnknown } from "../figure.js";
import { selectHousingRoom } from "./housing-room.js";
import { ESTIMATED_MINIMUMS_NOTE } from "./safe-to-spend.js";
import type { TakeHome } from "./take-home.js";

const takeHomeKnown = (monthly: number): ReturnType<typeof figureKnown<TakeHome>> =>
  figureKnown<TakeHome>({
    basis: "typed",
    monthly,
    annual: monthly * 12,
    incomeTax: null,
    nationalInsurance: null,
    studentLoan: null,
    pension: null,
    taxYear: null,
    region: null,
  });

const row = (overrides: Partial<BudgetEntryItem>): BudgetEntryItem => ({
  id: "row-1",
  category: "bills",
  name: "Bills",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ownership: "sole",
  sharePercent: null,
  ...overrides,
});

describe("selectHousingRoom (E39 section 4b)", () => {
  it("worked case 7: £2,600 take-home - £950 essentials - £150 debt = £1,500; with savings & other spending switches", () => {
    const budgetRows: BudgetEntryItem[] = [
      row({ id: "rent", category: "housing", name: "Rent", amount: 1100, isEssential: true }),
      row({ id: "bills", category: "bills", name: "Bills", amount: 950, isEssential: true }),
      row({ id: "debt", category: "debt", name: "Loan", amount: 150, isEssential: true }),
      row({ id: "save", category: "savings", name: "ISA", amount: 200, isEssential: false }),
      row({ id: "fun", category: "expenses", name: "Dining", amount: 400, isEssential: false }),
    ];

    const picture = {
      takeHome: takeHomeKnown(2600),
      budgetRows,
      housingPayment: { kind: "rent" as const, monthly: 1100, paymentEstimated: false },
    };

    const base = selectHousingRoom(picture);
    expect(base.status).toBe("known");
    if (base.status !== "known") return;
    // 2600 - 950 - 150 = 1500 (housing £1,100 excluded, carried as currentHousingMonthly fact)
    expect(base.value.monthly).toBe(1500);
    expect(base.value.essentialsWithoutHousing).toBe(950);
    expect(base.value.debtCommitment).toBe(150);
    expect(base.value.plannedSavings).toBe(200);
    expect(base.value.otherSpending).toBe(400);
    expect(base.value.includeSavings).toBe(false);
    expect(base.value.includeOtherSpending).toBe(false);
    expect(base.value.currentHousingMonthly).toBe(1100);
    expect(base.value.currentHousingKind).toBe("rent");
    expect(base.value.currentHousingEstimated).toBe(false);
    expect(base.provenance).toBe("derived");
    expect(base.assumptions).toBeUndefined();

    // With savings £200: 1500 - 200 = £1,300
    const withSavings = selectHousingRoom(picture, { includeSavings: true });
    expect(withSavings.status === "known" && withSavings.value.monthly).toBe(1300);

    // With savings £200 and other spending £400: 1300 - 400 = £900
    const withBoth = selectHousingRoom(picture, {
      includeSavings: true,
      includeOtherSpending: true,
    });
    expect(withBoth.status === "known" && withBoth.value.monthly).toBe(900);

    // With other spending only: 1500 - 400 = £1,100
    const withOtherOnly = selectHousingRoom(picture, { includeOtherSpending: true });
    expect(withOtherOnly.status === "known" && withOtherOnly.value.monthly).toBe(1100);
  });

  it("counts joint rows at the user's share and converts weekly/annual frequencies", () => {
    // Joint bills: £1,000 at 60% = £600
    // Weekly food: £100/week = 100 * 52 / 12 = £433.3333...
    // Annual insurance: £240/year = £20
    // Total essentials without housing = 600 + 433.3333... + 20 = 1053.33
    // Room = 3000 - 1053.33 = 1946.67
    const res = selectHousingRoom({
      takeHome: takeHomeKnown(3000),
      budgetRows: [
        row({ id: "j", amount: 1000, ownership: "joint", sharePercent: 60 }),
        row({ id: "w", amount: 100, frequency: "weekly" }),
        row({ id: "a", amount: 240, frequency: "annual" }),
      ],
    });
    expect(res.status).toBe("known");
    if (res.status !== "known") return;
    expect(res.value.essentialsWithoutHousing).toBe(1053.33);
    expect(res.value.monthly).toBe(1946.67);
    expect(res.value.currentHousingMonthly).toBeNull();
    expect(res.value.currentHousingKind).toBeNull();
  });

  it("uses snapshot debt minimums when higher than budgeted debt and carries estimated note", () => {
    const snapshot = new PortfolioSnapshot(
      [
        {
          id: "card-1",
          name: "Card",
          type: "Credit Card",
          currency: "GBP",
          balance: 4000,
          interestRate: 24,
        },
      ],
      [],
    );
    const res = selectHousingRoom(
      {
        takeHome: takeHomeKnown(2500),
        budgetRows: [row({ id: "b", amount: 700, isEssential: true })],
      },
      { snapshot },
    );
    expect(res.status).toBe("known");
    if (res.status !== "known") return;
    expect(res.value.debtCommitment).toBeGreaterThan(0);
    expect(res.value.monthly).toBe(2500 - 700 - res.value.debtCommitment);
    expect(res.assumptions).toContain(ESTIMATED_MINIMUMS_NOTE);
  });

  it("returns unknown (never 0) when take-home, budget, or essentials are missing", () => {
    const unknownTakeHome = selectHousingRoom({
      takeHome: figureUnknown(["annualSalary"], "unsupported-year", "Unsupported year"),
      budgetRows: [row({ id: "b", amount: 500 })],
    });
    expect(unknownTakeHome.status).toBe("unknown");
    if (unknownTakeHome.status === "unknown") {
      expect(unknownTakeHome.reason).toBe("unsupported-year");
      expect(unknownTakeHome.notice).toBe("Unsupported year");
    }

    const emptyBudget = selectHousingRoom({
      takeHome: takeHomeKnown(2500),
      budgetRows: [],
    });
    expect(emptyBudget.status).toBe("unknown");
    if (emptyBudget.status === "unknown") {
      expect(emptyBudget.missing).toEqual(["budget"]);
    }

    const noEssentials = selectHousingRoom({
      takeHome: takeHomeKnown(2500),
      budgetRows: [
        row({ id: "fun", amount: 200, isEssential: false }),
        row({ id: "zero", amount: 0, isEssential: true }),
      ],
    });
    expect(noEssentials.status).toBe("unknown");
    if (noEssentials.status === "unknown") {
      expect(noEssentials.missing).toEqual(["budgetEssentials"]);
    }

    const zeroTakeHome = selectHousingRoom({
      takeHome: takeHomeKnown(0),
      budgetRows: [row({ id: "b", amount: 500 })],
    });
    expect(zeroTakeHome.status).toBe("unknown");
    if (zeroTakeHome.status === "unknown") {
      expect(zeroTakeHome.missing).toEqual(["annualSalary"]);
    }
  });

  it("propagates takeHome assumptions, notSet take_home/savings, and skips estimated note when budget debt exceeds minimums", () => {
    const withTakeHomeAssumption = selectHousingRoom({
      takeHome: figureKnown(
        takeHomeKnown(2500).status === "known" ? takeHomeKnown(2500).value : (null as never),
        "assumption",
        ["Assuming no student loan."],
      ),
      budgetRows: [row({ id: "b", amount: 500, isEssential: true })],
      housingPayment: { kind: "mortgage", monthly: 900, paymentEstimated: true },
    });
    expect(withTakeHomeAssumption.status).toBe("known");
    if (withTakeHomeAssumption.status === "known") {
      expect(withTakeHomeAssumption.provenance).toBe("assumption");
      expect(withTakeHomeAssumption.assumptions).toEqual(["Assuming no student loan."]);
      expect(withTakeHomeAssumption.value.currentHousingEstimated).toBe(true);
    }

    const notSetTakeHome = selectHousingRoom({
      takeHome: takeHomeKnown(2500),
      budgetRows: [
        row({ id: "th", isIncome: true, linked: "take_home", notSet: true, amount: 0 }),
        row({ id: "b", amount: 500, isEssential: true }),
      ],
    });
    expect(notSetTakeHome.status).toBe("unknown");
    if (notSetTakeHome.status === "unknown") {
      expect(notSetTakeHome.missing).toEqual(["annualSalary"]);
    }

    const snapshot = new PortfolioSnapshot(
      [
        {
          id: "c1",
          name: "Card",
          type: "Credit Card",
          currency: "GBP",
          balance: 1000,
          interestRate: 20,
        },
      ],
      [],
    );
    const higherBudgetDebt = selectHousingRoom(
      {
        takeHome: takeHomeKnown(2500),
        budgetRows: [
          row({ id: "b", amount: 500, isEssential: true }),
          row({ id: "d", category: "debt", amount: 300, isEssential: true }),
        ],
      },
      { snapshot },
    );
    expect(higherBudgetDebt.status).toBe("known");
    if (higherBudgetDebt.status === "known") {
      expect(higherBudgetDebt.value.debtCommitment).toBe(300);
      expect(higherBudgetDebt.assumptions).toBeUndefined();
    }
  });

  it("ignores a notSet linked housing row but returns unknown on notSet savings/debt rows", () => {
    const withNotSetHousing = selectHousingRoom({
      takeHome: takeHomeKnown(2000),
      budgetRows: [
        row({ id: "h", category: "housing", linked: "housing", notSet: true, amount: 0 }),
        row({ id: "b", amount: 500, isEssential: true }),
      ],
    });
    expect(withNotSetHousing.status).toBe("known");
    if (withNotSetHousing.status === "known") {
      expect(withNotSetHousing.value.monthly).toBe(1500);
    }

    const withNotSetDebt = selectHousingRoom({
      takeHome: takeHomeKnown(2000),
      budgetRows: [
        row({ id: "d", category: "debt", linked: "debt", notSet: true, amount: 0 }),
        row({ id: "b", amount: 500, isEssential: true }),
      ],
    });
    expect(withNotSetDebt.status).toBe("unknown");
    if (withNotSetDebt.status === "unknown") {
      expect(withNotSetDebt.missing).toEqual(["linkedAccountMonthly"]);
    }
  });

  it("populates housingRoom on buildFinancialPicture", () => {
    const picture = buildFinancialPicture({
      profile: {
        annualSalary: null,
        monthlyTakeHome: 2600,
        housingStatus: "renting",
        monthlyHousingCost: 1100,
        taxYear: "2026-27",
        taxRegion: "england-wales-ni",
      },
      netWorthBasis: "all",
      accounts: [],
      details: [],
      budget: [
        row({ id: "bills", category: "bills", name: "Bills", amount: 950, isEssential: true }),
        row({ id: "debt", category: "debt", name: "Loan", amount: 150, isEssential: true }),
      ],
      taxRecords: [],
    });
    expect(picture.housingRoom.status).toBe("known");
    if (picture.housingRoom.status === "known") {
      expect(picture.housingRoom.value.monthly).toBe(1500);
      expect(picture.housingRoom.value.currentHousingMonthly).toBe(1100);
    }
  });
});
