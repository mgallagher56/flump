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
