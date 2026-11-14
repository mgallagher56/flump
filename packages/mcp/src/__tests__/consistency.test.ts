/**
 * Cross-surface consistency (E23 section 9.2), MCP half. Every persona's figures in the MCP
 * context pack, and in whichever of the budget and accounts resources are registered, must
 * equal the engine's financial picture, which the web harness (apps/web/app/test/consistency)
 * also checks the pages against. A new local formula in the pack or a resource fails here.
 * Resources removed by the MCP re-plan are skipped; the pack check always runs.
 */
import {
  buildFinancialPicture,
  buildFlumpAiContextPack,
  type FinancialBaseline,
  isFigureKnown,
  type NetWorthBasis,
  PortfolioSnapshot,
  resolveSnapshotNetWorthScope,
} from "@flump/finance-engine";
import { PERSONAS, type PersonaName } from "@flump/finance-engine/testing";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";

const BASELINE: FinancialBaseline = {
  userId: "persona",
  taxYear: "2026/27",
  ukRegion: "ENGLAND_NI_WALES",
  employmentStatus: "PAYE",
  annualGrossSalary: 0,
  annualBonusOrSideIncome: 0,
  pensionContributionPct: 0,
  employerPensionMatchPct: 0,
  isSalarySacrifice: false,
  studentLoanPlan: "NONE",
  propertyOwnershipSharePct: 100,
  financialStage: "STAGE_2_BUFFER_BUILD",
  enabledModules: [],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

const NAMES = Object.keys(PERSONAS) as PersonaName[];

describe.each(NAMES)("persona %s: MCP resources match the financial picture", (name) => {
  const { fixture } = PERSONAS[name];
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient({
      baseline: BASELINE,
      profileFacts: fixture.profile,
      netWorthBasis: fixture.netWorthBasis,
      accounts: fixture.accounts,
      accountDetails: fixture.details,
      budgetEntries: fixture.budget,
      taxRecords: fixture.taxRecords,
    });
  });
  afterAll(async () => h.close());

  const registered = async (uri: string) =>
    (await h.client.listResources()).resources.some((r) => r.uri === uri);

  const read = async (uri: string) => {
    const res = await h.client.readResource({ uri });
    const first = res.contents[0] as { text?: string };
    return JSON.parse(first.text ?? "{}");
  };

  it("context pack: budget summary equals the picture", () => {
    const picture = buildFinancialPicture(fixture);
    const pack = buildFlumpAiContextPack({
      baseline: BASELINE,
      profileFacts: fixture.profile,
      netWorthBasis: fixture.netWorthBasis,
      accounts: fixture.accounts,
      accountDetails: fixture.details,
      budgetEntries: fixture.budget,
    });
    const totals = isFigureKnown(picture.budget) ? picture.budget.value : null;
    const b = pack.budgetSummary;
    expect(b.monthlyIncome).toBe(totals?.hasIncome ? totals.income : null);
    expect(b.essentialBillsMonthly).toBe(totals?.essentials ?? null);
    expect(b.plannedSavingsMonthly).toBe(totals?.savings ?? null);
    expect(b.monthlySurplus).toBe(totals?.hasIncome ? totals.surplus : null);
    expect(b.emergencyRunwayMonths).toBe(
      isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value.months : null,
    );
    expect(b.safeToSpend?.weeklyAllowance ?? null).toBe(
      isFigureKnown(picture.safeToSpend) ? picture.safeToSpend.value.weekly : null,
    );
    expect(pack.portfolio.netWorth).toBe(picture.netWorth.netWorth);
    expect(pack.portfolio.totalConsumerDebt).toBe(picture.debt.consumerDebt);
  });

  it("budget resource (if registered): totals, safe to spend and months of cover", async () => {
    if (!(await registered("flump://context/budget"))) return;
    const picture = buildFinancialPicture(fixture);
    const budget = await read("flump://context/budget");
    const totals = isFigureKnown(picture.budget) ? picture.budget.value : null;
    expect(budget.monthlyIncomeGbp).toBe(totals?.hasIncome ? totals.income : null);
    expect(budget.essentialBillsMonthlyGbp).toBe(totals?.essentials ?? null);
    expect(budget.discretionarySpendMonthlyGbp).toBe(totals?.discretionary ?? null);
    expect(budget.monthlySurplusGbp).toBe(totals?.hasIncome ? totals.surplus : null);
    expect(budget.emergencyRunwayMonths).toBe(
      isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value.months : null,
    );
    expect(budget.safeToSpend?.weeklyAllowance ?? null).toBe(
      isFigureKnown(picture.safeToSpend) ? picture.safeToSpend.value.weekly : null,
    );
  });

  it("accounts resource (if registered): net worth and total debt", async () => {
    if (!(await registered("flump://context/accounts"))) return;
    const picture = buildFinancialPicture(fixture);
    const accounts = await read("flump://context/accounts");
    expect(accounts.netWorthGbp).toBe(picture.netWorth.netWorth);
    expect(accounts.liquidCashGbp).toBe(picture.netWorth.liquidCash);
    expect(accounts.consumerDebtGbp).toBe(picture.debt.consumerDebt);
  });
});

const BASES: NetWorthBasis[] = [
  { countProperty: true, countStudentLoan: false },
  { countProperty: true, countStudentLoan: true },
  { countProperty: false, countStudentLoan: false },
  { countProperty: false, countStudentLoan: true },
];

interface Envelope<T> {
  result: T;
}

describe.each(NAMES.flatMap((name) => BASES.map((basis) => [name, basis] as const)))(
  "persona %s under %o: MCP net worth matches the picture",
  (name, basis) => {
    const { fixture } = PERSONAS[name];
    const input = {
      baseline: BASELINE,
      profileFacts: fixture.profile,
      netWorthBasis: basis,
      accounts: fixture.accounts,
      accountDetails: fixture.details,
      budgetEntries: fixture.budget,
      taxRecords: fixture.taxRecords,
    };
    let h: TestHarness;
    beforeAll(async () => {
      h = await connectTestClient(input);
    });
    afterAll(async () => h.close());

    const picture = () => buildFinancialPicture({ ...fixture, netWorthBasis: basis });

    it("context pack: net worth, totals and leave-out list", () => {
      const p = picture();
      const pack = buildFlumpAiContextPack(input);
      expect(pack.portfolio.netWorth).toBe(p.netWorth.netWorth);
      expect(pack.portfolio.totalAssets).toBe(p.netWorth.totalAssets);
      expect(pack.portfolio.totalLiabilities).toBe(p.netWorth.totalLiabilities);
      expect(pack.portfolio.netWorthLeavesOut).toEqual(p.netWorth.leftOut);
    });

    it("get_financial_snapshot: net worth, totals and leave-out list", async () => {
      const p = picture();
      const round2 = (n: number) => Math.round(n * 100) / 100;
      const e = (await h.callJson("get_financial_snapshot")) as Envelope<{
        netWorthGbp: number;
        assetsGbp: number;
        liabilitiesGbp: number;
        netWorthLeavesOut: string[];
      }>;
      expect(e.result.netWorthGbp).toBe(round2(p.netWorth.netWorth));
      expect(e.result.assetsGbp).toBe(round2(p.netWorth.totalAssets));
      expect(e.result.liabilitiesGbp).toBe(round2(p.netWorth.totalLiabilities));
      expect(e.result.netWorthLeavesOut).toEqual(p.netWorth.leftOut);
    });

    it("get_balance_history total: every month matches the engine history", async () => {
      const history = new PortfolioSnapshot(fixture.accounts, fixture.details).getMonthlyHistory(
        basis,
        120,
      );
      const leftOut = resolveSnapshotNetWorthScope(
        new PortfolioSnapshot(fixture.accounts, fixture.details),
        basis,
      ).leftOut;
      const first = history[0];
      const last = history[history.length - 1];
      if (!first || !last) return;
      const month = (p: { year: number; month: number }) =>
        `${p.year}-${String(p.month).padStart(2, "0")}`;
      const e = (await h.callJson("get_balance_history", {
        from: month(first),
        to: month(last),
        groupBy: "total",
      })) as Envelope<{
        series: Array<{ points: Array<{ period: string; value: number }> }>;
        netWorthLeavesOut: string[];
      }>;
      expect(e.result.netWorthLeavesOut).toEqual(leftOut);
      const points = e.result.series[0]?.points ?? [];
      // The current London month (the clock is 2026-11) ends on the saved balances, as on the
      // web history page, so it equals the picture's net worth; earlier months are the engine's.
      const current = "2026-11";
      const expected = history
        .filter((p) => p.totalAssets !== 0 || p.totalLiabilities !== 0)
        .map((p) => ({
          period: month(p),
          value:
            Math.round((month(p) === current ? picture().netWorth.netWorth : p.netWorth) * 100) /
            100,
        }));
      expect(points.map((p) => ({ period: p.period, value: p.value }))).toEqual(
        expect.arrayContaining(expected),
      );
    });
  },
);
