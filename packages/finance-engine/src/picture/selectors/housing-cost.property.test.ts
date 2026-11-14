/**
 * E32: property tests for the housing cost share and the fix-end fact (fast-check, fixed seed).
 */
import fc from "fast-check";
import { describe, it } from "vitest";
import type { BudgetEntryItem } from "../../ai-context-pack.js";
import { PortfolioSnapshot, type RawAccount } from "../../portfolio.js";
import { buildFinancialPicture } from "../build.js";
import { type Figure, figureKnown, figureUnknown } from "../figure.js";
import type { ProfileFacts } from "../input.js";
import { fixedRateEnd, selectHousingCost } from "./housing-cost.js";
import type { TakeHome } from "./take-home.js";

const PARAMS = { seed: 20261114, numRuns: 200 } as const;

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

const base: ProfileFacts = {
  annualSalary: 40000,
  employmentType: "employed",
  taxRegion: "ENGLAND",
  studentLoanPlans: [],
  pensionPercent: 5,
  isSalarySacrifice: false,
  housingStatus: null,
  monthlyHousingCost: null,
  mortgageType: null,
};

const status = fc.constantFrom("renting", "mortgage", "own_outright", null) as fc.Arbitrary<
  ProfileFacts["housingStatus"]
>;
const cost = fc.option(fc.integer({ min: -500, max: 10_000 }), { nil: null });
const takeHomeFig = fc.oneof(
  fc.integer({ min: -100, max: 20_000 }).map(takeHome),
  fc.constant(figureUnknown<TakeHome>(["annualSalary"], "not-set")),
);
const mortgageAccount = fc.record({
  id: fc.constantFrom("m1", "m2", "m3"),
  type: fc.constant("Mortgage"),
  balance: fc.integer({ min: 0, max: 900_000 }),
  interestRate: fc.option(fc.double({ min: 0, max: 12, noNaN: true }), { nil: null }),
  termMonths: fc.option(fc.integer({ min: 0, max: 480 }), { nil: null }),
}) as fc.Arbitrary<RawAccount>;
const accounts = fc.array(mortgageAccount, { maxLength: 3 });
const budgetRow = fc.record({
  id: fc.string(),
  category: fc.constantFrom("housing", "bills", "income"),
  name: fc.constantFrom("Rent", "Mortgage", "Rent Payment"),
  amount: fc.integer({ min: 0, max: 5000 }),
  frequency: fc.constant("monthly"),
  isIncome: fc.boolean(),
  isEssential: fc.boolean(),
}) as fc.Arbitrary<BudgetEntryItem>;

const run = (p: ProfileFacts, th: Figure<TakeHome>, accs: RawAccount[]) =>
  selectHousingCost(p, th, new PortfolioSnapshot(accs, []), accs);

describe("selectHousingCost properties", () => {
  it("a known share has a positive monthly cost and equals cost over take-home", () => {
    fc.assert(
      fc.property(status, cost, takeHomeFig, accounts, (s, c, th, accs) => {
        const fig = run({ ...base, housingStatus: s, monthlyHousingCost: c }, th, accs);
        if (fig.status !== "known") return true;
        const v = fig.value;
        return (
          v.monthly > 0 &&
          v.takeHomeMonthly > 0 &&
          Number.isFinite(v.sharePct) &&
          Math.abs(v.sharePct - (v.monthly / v.takeHomeMonthly) * 100) <= 0.05 + 1e-9
        );
      }),
      PARAMS,
    );
  });

  it("is unknown whenever the housing cost or take-home is missing", () => {
    fc.assert(
      fc.property(status, takeHomeFig, (s, th) => {
        const noCost = run({ ...base, housingStatus: s, monthlyHousingCost: null }, th, []);
        const noTakeHome = run(
          { ...base, housingStatus: s, monthlyHousingCost: 900 },
          figureUnknown(["annualSalary"], "not-set"),
          [],
        );
        return noCost.status === "unknown" && noTakeHome.status === "unknown";
      }),
      PARAMS,
    );
  });

  it("never reads budget rows: the picture's housing cost is the same with any budget", () => {
    fc.assert(
      fc.property(status, cost, accounts, fc.array(budgetRow), (s, c, accs, rows) => {
        const profile = { ...base, housingStatus: s, monthlyHousingCost: c };
        const opts = { taxYear: "2026/27", asOf: new Date("2026-11-14T00:00:00Z") } as const;
        const without = buildFinancialPicture(
          { profile, accounts: accs, details: [], budget: [] },
          opts,
        );
        const withRows = buildFinancialPicture(
          { profile, accounts: accs, details: [], budget: rows },
          opts,
        );
        return JSON.stringify(without.housingCost) === JSON.stringify(withRows.housingCost);
      }),
      PARAMS,
    );
  });
});

describe("fixedRateEnd properties", () => {
  const day = 86_400_000;
  const start = Date.UTC(2020, 0, 1);
  const instant = fc.integer({ min: 0, max: 365 * 15 }).map((d) => new Date(start + d * day));
  const iso = instant.map((d) => d.toISOString().slice(0, 10));

  it("months remaining is never negative and never rises as time passes", () => {
    fc.assert(
      fc.property(iso, instant, fc.integer({ min: 0, max: 400 }), (date, asOf, later) => {
        const a = fixedRateEnd(date, asOf);
        const b = fixedRateEnd(date, new Date(asOf.getTime() + later * day));
        if (!a || !b) return false;
        return a.monthsRemaining >= 0 && b.monthsRemaining <= a.monthsRemaining;
      }),
      PARAMS,
    );
  });

  it("once ended, stays ended", () => {
    fc.assert(
      fc.property(iso, instant, fc.integer({ min: 0, max: 400 }), (date, asOf, later) => {
        const a = fixedRateEnd(date, asOf);
        const b = fixedRateEnd(date, new Date(asOf.getTime() + later * day));
        return !a?.ended || b?.ended === true;
      }),
      PARAMS,
    );
  });
});
