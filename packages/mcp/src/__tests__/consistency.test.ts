/**
 * Cross-surface consistency (E23 section 9.2), MCP half. Every persona's figures in the MCP
 * resources must equal the engine's financial picture, which the web harness
 * (apps/web/app/test/consistency) also checks the pages against. A new local formula in a
 * resource fails here.
 */
import {
  buildFinancialPicture,
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

  const read = async (uri: string) => {
    const res = await h.client.readResource({ uri });
    const first = res.contents[0] as { text?: string };
    return JSON.parse(first.text ?? "{}");
  };

  it("budget resource: totals, safe to spend and months of cover", async () => {
    vi.setSystemTime(new Date("2026-11-13T12:00:00Z"));
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

  it("accounts resource: net worth and total debt", async () => {
    const picture = buildFinancialPicture(fixture);
    const accounts = await read("flump://context/accounts");
    expect(accounts.netWorthGbp).toBe(picture.netWorth.netWorth);
    expect(accounts.liquidCashGbp).toBe(picture.netWorth.liquidCash);
    expect(accounts.consumerDebtGbp).toBe(picture.debt.consumerDebt);
  });
});
