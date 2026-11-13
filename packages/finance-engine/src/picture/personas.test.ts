import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortfolioSnapshot } from "../portfolio.js";
import {
  calculateUKTax,
  getRecordAnnualTotalForTaxYear,
  getTaxYearForRecordDate,
  type TaxRecord,
} from "../tax-calculator.js";
import { calculate100kTaxTrap } from "../uk-tax.js";
import {
  dan,
  danTaxYearsExpected,
  debtStressedItemsExpected,
  garethContributionsExpected,
  heavy,
  heavyHistoryExpected,
  heavyTaxYearsExpected,
  newUser,
  PERSONAS,
  type PersonaFixture,
  type PersonaName,
  priyaTrapExpected,
  trapEdgeTrapExpected,
  trapEdgeVariants,
} from "./__fixtures__/index.js";
import { isFigureKnown } from "./figure.js";
import { profileFactsFromProfile } from "./input.js";
import { selectTakeHome, type TakeHome } from "./selectors/take-home.js";

/**
 * Engine-level persona tests (E23 section 9.2). Tax amounts are never asserted: no tax vector
 * is owner-signed (E23 section 10; OWNER_SIGNED_IDS is empty in uk-tax.vectors.test.ts), so tax
 * figures assert status, provenance, region and relationships. Record sums are plain addition.
 */

const TAX_YEAR = "2026/27";
const OPTS = { taxYear: TAX_YEAR } as const;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const NAMES = Object.keys(PERSONAS) as PersonaName[];

function takeHomeValue(fixture: PersonaFixture): TakeHome {
  const fig = selectTakeHome(fixture.profile, OPTS);
  if (!isFigureKnown(fig)) throw new Error(`expected known take-home: ${JSON.stringify(fig)}`);
  return fig.value;
}

function snapshot(fixture: PersonaFixture): PortfolioSnapshot {
  return new PortfolioSnapshot(fixture.accounts, fixture.details);
}

function budgetTotals(fixture: PersonaFixture) {
  const sum = (rows: PersonaFixture["budget"]) => rows.reduce((s, r) => s + r.amount, 0);
  const income = sum(fixture.budget.filter((r) => r.isIncome));
  const spend = fixture.budget.filter((r) => !r.isIncome);
  const essentials = sum(spend.filter((r) => r.isEssential));
  const savings = sum(spend.filter((r) => !r.isEssential && r.category === "savings"));
  const discretionary = sum(spend.filter((r) => !r.isEssential && r.category !== "savings"));
  return {
    income,
    essentials,
    savings,
    discretionary,
    surplus: income - essentials - savings - discretionary,
  };
}

describe.each(NAMES)("persona %s: take-home", (name) => {
  const { fixture, expected } = PERSONAS[name];
  const th = expected.takeHome;

  it("matches the expected status, provenance, region and relationships", () => {
    const fig = selectTakeHome(fixture.profile, OPTS);
    expect(fig.status).toBe(th.status);
    if (th.status === "unknown") {
      expect(fig).toEqual({ status: "unknown", missing: th.missing, reason: th.reason });
      expect("value" in fig).toBe(false);
      return;
    }
    if (!isFigureKnown(fig)) throw new Error("expected known");
    expect(fig.provenance).toBe(th.provenance);
    expect(fig.assumptions ?? []).toEqual(th.assumptions);
    const v = fig.value;
    expect(v.region).toBe(th.region);
    expect(v.taxYear).toBe(TAX_YEAR);
    expect(v.pension).toBe(th.pensionDeduction);
    expect(v.studentLoan > 0).toBe(th.hasStudentLoanDeduction);
    // One single value: the monthly figure is the annual figure over twelve (rounded).
    expect(Math.abs(v.monthly * 12 - v.annual)).toBeLessThanOrEqual(6);
    // Identity: take-home is salary less every deduction (rounded to whole pounds).
    const salary = fixture.profile.annualSalary as number;
    const deductions = v.pension + v.incomeTax + v.nationalInsurance + v.studentLoan;
    expect(Math.abs(v.annual - (salary - deductions))).toBeLessThan(1);
    expect(v.annual).toBeGreaterThan(0);
    expect(v.annual).toBeLessThan(salary);
  });
});

describe.each(NAMES)("persona %s: portfolio totals", (name) => {
  const { fixture, expected } = PERSONAS[name];
  const p = expected.portfolio;

  it("matches the hand-derived totals", () => {
    const snap = snapshot(fixture);
    expect(snap.getTotalNetWorth()).toBe(p.netWorth);
    expect(snap.getTotalAssets()).toBe(p.totalAssets);
    expect(snap.getTotalLiabilities()).toBe(p.totalLiabilities);
    expect(snap.getTotalConsumerDebt()).toBe(p.consumerDebt);
    expect(snap.getTotalLiquidCash()).toBe(p.liquidCash);
    expect(snap.getTotalInvestments()).toBe(p.investments);
    expect(snap.getTotalPensions()).toBe(p.pensions);
    expect(snap.getTotalProperty()).toBe(p.property);
    expect(snap.getTotalStudentLoans()).toBe(p.studentLoans);
    expect(snap.getTotalMortgageBalance()).toBe(p.mortgageBalance);
    expect(snap.toDebtItems().map((d) => d.id)).toEqual(p.debtItemIds);
    // Net worth is always assets minus liabilities; a student loan is in neither.
    expect(snap.getTotalAssets() - snap.getTotalLiabilities()).toBe(snap.getTotalNetWorth());
  });

  it("has fixture budget rows that sum to the expected totals", () => {
    expect(budgetTotals(fixture)).toEqual(expected.budget);
  });
});

describe.each(NAMES.filter((n) => n !== "newUser" && PERSONAS[n].fixture.budget.length > 0))(
  "persona %s: budget salary row",
  (name) => {
    it("equals the engine take-home monthly figure (2026/27)", () => {
      const { fixture } = PERSONAS[name];
      const row = fixture.budget.find((b) => b.isIncome && b.name === "Salary (net)");
      expect(row?.amount).toBe(takeHomeValue(fixture).monthly);
    });
  },
);

describe("P1 Sam", () => {
  const { fixture } = PERSONAS.sam;

  it("pays a Plan 2 deduction that lowers take-home, and keeps the loan out of payoff", () => {
    const withLoan = takeHomeValue(fixture);
    const without = takeHomeValue({
      ...fixture,
      profile: { ...fixture.profile, studentLoanPlans: [] },
    });
    expect(withLoan.studentLoan).toBeGreaterThan(0);
    expect(withLoan.monthly).toBeLessThan(without.monthly);
    const snap = snapshot(fixture);
    expect(snap.toDebtItems()).toEqual([]);
    expect(snap.getAccount("sam-student-loan")?.netWorthBalance).toBe(0);
  });
});

describe("P2 Priya", () => {
  it("names both trap rates: 60 income tax and 62 including NI", () => {
    const trap = calculate100kTaxTrap(112000, 8, true, "ENGLAND_NI_WALES", TAX_YEAR);
    const e = priyaTrapExpected;
    expect(trap.isInTaxTrap).toBe(e.isInTaxTrap);
    expect(trap.isNearTaxTrap).toBe(e.isNearTaxTrap);
    expect(trap.adjustedNetIncome).toBe(e.adjustedNetIncome);
    expect(trap.excessOver100kGbp).toBe(e.excessOver100k);
    expect(trap.personalAllowanceTaperGbp).toBe(e.personalAllowanceTaper);
    expect(trap.marginalRatePct).toBe(e.marginalRatePct);
    expect(trap.effectiveMarginalRatePct).toBe(e.effectiveMarginalRatePct);
    expect(trap.contributionRequiredToEscapeGbp).toBe(e.contributionRequiredToEscape);
    expect(trap.effectiveMarginalRatePct).toBeGreaterThan(trap.marginalRatePct);
  });

  it("carries one take-home value from the salary-sacrifice facts", () => {
    const v = takeHomeValue(PERSONAS.priya.fixture);
    expect(v.pension).toBe(8960);
    expect(Number.isInteger(v.monthly)).toBe(true);
  });
});

describe("trap edges", () => {
  const keys = ["at100k", "at112570", "at125140", "at125141"] as const;

  it.each(keys)("trap fields at %s", (key) => {
    const salary = trapEdgeVariants[key].annualSalary as number;
    const trap = calculate100kTaxTrap(salary, 0, false, "ENGLAND_NI_WALES", TAX_YEAR);
    const e = trapEdgeTrapExpected[key];
    expect(trap.isInTaxTrap).toBe(e.isInTaxTrap);
    expect(trap.isNearTaxTrap).toBe(e.isNearTaxTrap);
    expect(trap.adjustedNetIncome).toBe(e.adjustedNetIncome);
    expect(trap.excessOver100kGbp).toBe(e.excessOver100k);
    expect(trap.personalAllowanceTaperGbp).toBe(e.personalAllowanceTaper);
    expect(trap.marginalRatePct).toBe(e.marginalRatePct);
    expect(trap.effectiveMarginalRatePct).toBe(e.effectiveMarginalRatePct);
    expect(trap.contributionRequiredToEscapeGbp).toBe(e.contributionRequiredToEscape);
  });

  it("escaping saves no more than the marginal rate times the excess (relationship)", () => {
    for (const key of ["at112570", "at125140"] as const) {
      const salary = trapEdgeVariants[key].annualSalary as number;
      const trap = calculate100kTaxTrap(salary, 0, false, "ENGLAND_NI_WALES", TAX_YEAR);
      expect(trap.estimatedTaxSavedByEscapingGbp).toBeGreaterThan(0);
      expect(trap.estimatedTaxSavedByEscapingGbp).toBeLessThanOrEqual(
        (trap.excessOver100kGbp * trap.marginalRatePct) / 100 + 1,
      );
    }
  });

  it("gives a known take-home at every edge, and more pay as salary rises", () => {
    const annual = keys.map((k) => {
      const fig = selectTakeHome(trapEdgeVariants[k], OPTS);
      if (!isFigureKnown(fig)) throw new Error("expected known");
      expect(fig.provenance).toBe("derived");
      return fig.value.annual;
    });
    // Even at 62% marginal, each extra pound still nets 38p, so take-home never falls.
    expect(annual[1]).toBeGreaterThan(annual[0] as number);
    expect(annual[2]).toBeGreaterThan(annual[1] as number);
    // One extra pound nets 53p, which can round to the same whole-pound figure.
    expect(annual[3]).toBeGreaterThanOrEqual(annual[2] as number);
  });
});

describe("Scottish 50k 2026/27", () => {
  const { fixture } = PERSONAS.scottish;

  it("uses Scottish bands: more income tax and less take-home than England on the same facts", () => {
    const scot = takeHomeValue(fixture);
    const eng = takeHomeValue({
      ...fixture,
      profile: { ...fixture.profile, taxRegion: "ENGLAND" },
    });
    expect(scot.region).toBe("SCOTLAND");
    expect(eng.region).toBe("ENGLAND_NI_WALES");
    expect(scot.incomeTax).toBeGreaterThan(eng.incomeTax);
    expect(scot.nationalInsurance).toBe(eng.nationalInsurance);
    expect(scot.monthly).toBeLessThan(eng.monthly);
  });

  it("has a higher Scottish trap rate: 67.5 income tax and 69.5 including NI", () => {
    const trap = calculate100kTaxTrap(110000, 0, false, "SCOTLAND", TAX_YEAR);
    expect(trap.marginalRatePct).toBe(67.5);
    expect(trap.effectiveMarginalRatePct).toBe(69.5);
  });

  it.todo(
    "assert the Scottish 50,000 income tax amount once vector scotland.incomeTax.2026-27.50000 is signed off",
  );
});

describe("P3 Gareth", () => {
  const { fixture } = PERSONAS.gareth;
  const snap = snapshot(fixture);

  it("keeps contributions per pot, not as one global figure (D21)", () => {
    const e = garethContributionsExpected;
    expect(snap.getAccount("gareth-workplace")?.monthlyContribution).toBe(e["gareth-workplace"]);
    expect(snap.getAccount("gareth-sipp")?.monthlyContribution).toBe(e["gareth-sipp"]);
    expect(snap.getAccount("gareth-isa")?.monthlyContribution).toBe(e["gareth-isa"]);
    expect(snap.getAccount("gareth-sipp")?.monthlyContributionKnown).toBe(true);
    const pensionMonthly = snap
      .getAccountsByCategory("pensions")
      .reduce((s, a) => s + a.monthlyContribution, 0);
    expect(pensionMonthly).toBe(e.pensionsMonthly);
  });

  it("matches the workplace pot to the profile pension percentage", () => {
    const v = takeHomeValue(fixture);
    expect(v.pension / 12).toBe(snap.getAccount("gareth-workplace")?.monthlyContribution);
  });

  it("has a mortgage near its end: small balance, few months left, known rate", () => {
    const mortgage = snap.getAccount("gareth-mortgage");
    expect(mortgage?.interestRateKnown).toBe(true);
    expect(mortgage?.nominalBalance).toBeLessThan(snap.getTotalProperty() * 0.1);
    const raw = fixture.accounts.find((a) => a.id === "gareth-mortgage");
    expect(raw?.termMonths).toBe(36);
  });
});

describe("P4 Dan: self assessment records over two tax years", () => {
  const expectedYears = Object.keys(danTaxYearsExpected);

  it.each(expectedYears)("sums the rental records for %s", (year) => {
    const r = calculateUKTax(year, dan.taxRecords, 46000, 100);
    const e = danTaxYearsExpected[year];
    expect(r.rentalIncomeGross).toBe(e?.rentalIncomeGross);
    expect(r.rentalExpensesExclInterest).toBe(e?.rentalExpensesExclInterest);
    expect(r.rentalMortgageInterest).toBe(e?.rentalMortgageInterest);
    expect(r.rentalProfitBeforeInterest).toBe(e?.rentalProfitBeforeInterest);
    expect(r.seProfit).toBe(e?.seProfit);
  });

  it("counts each annual record once, in its own year only", () => {
    const annual = dan.taxRecords.filter((t) => t.frequency === "annual");
    expect(annual).toHaveLength(4);
    for (const rec of annual) {
      const own = getTaxYearForRecordDate(rec.date);
      const other = own === "2026/27" ? "2025/26" : "2026/27";
      expect(getRecordAnnualTotalForTaxYear(rec, own)).toBe(Number(rec.amount));
      expect(getRecordAnnualTotalForTaxYear(rec, other)).toBe(0);
      expect(getRecordAnnualTotalForTaxYear(rec, "2024/25")).toBe(0);
    }
  });

  it("applies the Section 24 credit at 20% of the finance cost, and owes extra tax on top of PAYE", () => {
    for (const year of ["2025/26", "2026/27"]) {
      const r = calculateUKTax(year, dan.taxRecords, 46000, 100);
      expect(r.rentalPropertyTaxCredit).toBeCloseTo(
        (danTaxYearsExpected[year]?.rentalMortgageInterest ?? 0) * 0.2,
        2,
      );
      expect(r.rentalPropertyTaxDueAfterCredit).toBeCloseTo(
        r.rentalPropertyTaxDueBeforeCredit - r.rentalPropertyTaxCredit,
        2,
      );
      expect(r.netAdditionalTaxToPay).toBeGreaterThan(0);
      expect(r.effectivePayeSalary).toBe(46000);
    }
  });

  it("owes nothing extra in a year with no records (2024/25)", () => {
    const r = calculateUKTax("2024/25", dan.taxRecords, 46000, 100);
    expect(r.rentalIncomeGross).toBe(0);
    expect(r.netAdditionalTaxToPay).toBe(0);
  });
});

describe("P6 debt-stressed", () => {
  const { fixture } = PERSONAS.debtStressed;
  const snap = snapshot(fixture);

  it("counts the overdrawn account as consumer debt and as a liability (C-15)", () => {
    const current = snap.getAccount("debt-current");
    expect(current?.nominalBalance).toBe(-640);
    expect(current?.overdrawnAmount).toBe(640);
    expect(snap.getTotalConsumerDebt()).toBe(15010);
  });

  it("never invents a rate or payment for a card with none stored", () => {
    const items = snap.toDebtItems();
    expect(items).toHaveLength(3);
    for (const item of items) {
      const e = debtStressedItemsExpected[item.id as keyof typeof debtStressedItemsExpected];
      expect(item.balance).toBe(e.balance);
      expect(item.apr).toBe(e.apr);
      expect(item.aprKnown).toBe(e.aprKnown);
      expect(item.minimumPayment).toBe(e.minimumPayment);
      expect(item.minimumPaymentEstimated).toBe(e.estimated);
    }
  });

  it("spends more than it earns", () => {
    expect(budgetTotals(fixture).surplus).toBeLessThan(0);
  });
});

describe("new user", () => {
  it("is unknown for take-home and names exactly the missing facts", () => {
    const fig = selectTakeHome(newUser.profile, OPTS);
    expect(fig).toEqual({
      status: "unknown",
      missing: ["employmentType", "pensionPercent", "isSalarySacrifice"],
      reason: "not-set",
    });
  });

  it("invents nothing when the stored profile only holds a salary", () => {
    const facts = profileFactsFromProfile({ annualSalary: "32000" } as never);
    expect(facts).toEqual({
      annualSalary: 32000,
      employmentType: null,
      taxRegion: null,
      studentLoanPlans: null,
      pensionPercent: null,
      isSalarySacrifice: null,
    });
    expect(facts).toEqual(newUser.profile);
  });

  it("has no portfolio, history, budget or tax rows", () => {
    const snap = snapshot(newUser);
    expect(snap.getResolvedAccounts()).toEqual([]);
    expect(snap.getMonthlyHistory()).toEqual([]);
    expect(snap.toDebtItems()).toEqual([]);
    expect(newUser.budget).toEqual([]);
    expect(newUser.taxRecords).toEqual([]);
  });
});

describe("heavy persona", () => {
  const snap = snapshot(heavy);

  it("has the E16 dataset shape: 17 accounts, 22 budget entries, 28 tax records", () => {
    expect(heavy.accounts).toHaveLength(17);
    expect(heavy.budget).toHaveLength(22);
    expect(heavy.taxRecords).toHaveLength(28);
    const types = new Set(heavy.accounts.map((a) => a.type));
    for (const t of ["Property", "Student Loan", "Owed", "Overdraft"]) {
      expect(types.has(t)).toBe(true);
    }
  });

  it("treats the Owed IOU as an asset that is neither cash nor debt", () => {
    const owed = snap.getAccount("heavy-owed");
    expect(owed?.isAsset).toBe(true);
    expect(owed?.category).toBe("other");
    expect(snap.toDebtItems().map((d) => d.id)).not.toContain("heavy-owed");
  });

  // History only includes accounts that have detail rows (portfolio.ts filters on
  // history.length > 0), so its end-state net worth differs from getTotalNetWorth() by design today.
  it("carries values forward month by month, with the later duplicate row winning", () => {
    const history = snap.getMonthlyHistory(12);
    expect(history).toHaveLength(heavyHistoryExpected.length);
    history.forEach((point, i) => {
      const e = heavyHistoryExpected[i];
      expect([point.year, point.month]).toEqual([e?.year, e?.month]);
      expect(point.totalAssets).toBe(e?.totalAssets);
      expect(point.totalLiabilities).toBe(e?.totalLiabilities);
      expect(point.netWorth).toBe(e?.netWorth);
    });
  });

  it("limits history to the most recent months asked for", () => {
    const last3 = snap.getMonthlyHistory(3);
    expect(last3.map((p) => p.month)).toEqual([9, 10, 11]);
    expect(last3.at(-1)?.netWorth).toBe(heavyHistoryExpected.at(-1)?.netWorth);
  });

  it("excludes the student loan from history", () => {
    const withoutLoanRow = new PortfolioSnapshot(
      heavy.accounts,
      heavy.details.filter((d) => d.accountId !== "heavy-student-loan"),
    );
    expect(withoutLoanRow.getMonthlyHistory(12)).toEqual(snap.getMonthlyHistory(12));
  });

  it.each(Object.keys(heavyTaxYearsExpected))("sums the records for %s on its own", (year) => {
    const r = calculateUKTax(year, heavy.taxRecords, 118000, 100);
    const e = heavyTaxYearsExpected[year];
    expect(r.rentalIncomeGross).toBe(e?.rentalIncomeGross);
    expect(r.rentalExpensesExclInterest).toBe(e?.rentalExpensesExclInterest);
    expect(r.rentalMortgageInterest).toBe(e?.rentalMortgageInterest);
    expect(r.rentalProfitBeforeInterest).toBe(e?.rentalProfitBeforeInterest);
    expect(r.seIncomeGross).toBe(e?.seIncomeGross);
    expect(r.seExpenses).toBe(e?.seExpenses);
    expect(r.seProfit).toBe(e?.seProfit);
    expect(r.savingsInterestGross).toBe(e?.savingsInterestGross);
    expect(r.dividendIncomeGross).toBe(e?.dividendIncomeGross);
    expect(r.rentalPropertyTaxCredit).toBeCloseTo((e?.rentalMortgageInterest ?? 0) * 0.2, 2);
    expect(r.netAdditionalTaxToPay).toBeGreaterThan(0);
  });

  it("files annual records once each in four separate years", () => {
    const years = Object.keys(heavyTaxYearsExpected);
    expect(years).toHaveLength(4);
    const annual: TaxRecord[] = heavy.taxRecords.filter((t) => t.frequency === "annual");
    expect(annual).toHaveLength(24);
    for (const rec of annual) {
      const hits = years.filter((y) => getRecordAnnualTotalForTaxYear(rec, y) > 0);
      expect(hits, rec.id).toHaveLength(1);
      expect(getRecordAnnualTotalForTaxYear(rec, hits[0] as string)).toBe(Number(rec.amount));
    }
    const interestAcrossYears = years.reduce(
      (s, y) => s + calculateUKTax(y, heavy.taxRecords, 118000, 100).rentalMortgageInterest,
      0,
    );
    expect(interestAcrossYears).toBe(26000); // 6,000 + 6,250 + 6,750 + 7,000
  });

  it("sits in the trap with the 8% sacrifice and gives one named pair of rates", () => {
    const trap = calculate100kTaxTrap(118000, 8, true, "ENGLAND_NI_WALES", TAX_YEAR);
    expect(trap.adjustedNetIncome).toBe(108560); // 118,000 - 9,440
    expect(trap.isInTaxTrap).toBe(true);
    expect(trap.marginalRatePct).toBe(60);
    expect(trap.effectiveMarginalRatePct).toBe(62);
  });
});
