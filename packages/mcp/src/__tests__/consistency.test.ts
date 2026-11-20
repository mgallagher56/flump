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
  type FinancialPicture,
  isFigureKnown,
  loadFinancialPicture,
  type NetWorthBasis,
  PortfolioSnapshot,
  resolveSnapshotNetWorthScope,
  type SnapshotRow,
  selectNetWorthSeries,
} from "@flump/finance-engine";
import { PERSONAS, type PersonaName } from "@flump/finance-engine/testing";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { inMemoryPictureSource } from "../provider/in-memory.js";
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
  taxYear?: string;
  missing?: Array<{ field: string }>;
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

    it("project_net_worth: year 0 is the picture's net worth under the basis", async () => {
      const p = picture();
      const e = (await h.callJson("project_net_worth", { expectedReturnPct: 5 })) as Envelope<{
        startingNetWorthGbp: number;
      }>;
      expect(e.result.startingNetWorthGbp).toBe(Math.round(p.netWorth.netWorth * 100) / 100);
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
      const history = selectNetWorthSeries(
        fixture.accounts,
        fixture.details as SnapshotRow[],
        basis,
      );
      const leftOut = resolveSnapshotNetWorthScope(
        new PortfolioSnapshot(fixture.accounts, fixture.details),
        basis,
      ).leftOut;
      const first = history[0];
      const last = history[history.length - 1];
      if (!first || !last) return;
      const month = (p: { month: string }) => p.month;
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

// ---------------------------------------------------------------------------------------------
// The one assembler (audit slice 3, owner decision 10 option B). Every AI read tool's shared
// figure must equal the picture `loadFinancialPicture` builds from the same rows. The web half
// of this contract (pages against the same picture) is added beside these cases in phase B.
// ---------------------------------------------------------------------------------------------

interface SnapshotResult {
  netWorthGbp: number;
  assetsGbp: number;
  liabilitiesGbp: number;
  monthlyIncomeGbp: number | null;
  monthlyEssentialSpendGbp: number | null;
  monthlySurplusAfterStoredMinimumsGbp: number | null;
  emergencyRunwayMonths: number | null;
}
interface BudgetResult {
  monthlyIncomeGbp: number | null;
  essentialMonthlyGbp: number;
  discretionaryMonthlyGbp: number;
  savingsMonthlyGbp: number;
  monthlySurplusBeforeDebtGbp: number | null;
  categories: Array<{ monthlyGbp: number }>;
}
interface DebtResult {
  totalConsumerDebtGbp: number;
  totalMinimumPaymentsGbp: number;
  debtFreeDateOnMinimums: string | null;
  mortgageGbp: number;
  studentLoanGbp: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Reads the three summary tools and checks each shared figure against the loaded picture. */
async function expectToolsMatchPicture(h: TestHarness, picture: FinancialPicture) {
  const budget = isFigureKnown(picture.budget) ? picture.budget.value : null;
  const cover = isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value : null;

  const snap = ((await h.callJson("get_financial_snapshot")) as Envelope<SnapshotResult>).result;
  expect(snap.netWorthGbp).toBe(round2(picture.netWorth.netWorth));
  expect(snap.assetsGbp).toBe(round2(picture.netWorth.totalAssets));
  expect(snap.liabilitiesGbp).toBe(round2(picture.netWorth.totalLiabilities));
  expect(snap.monthlyIncomeGbp).toBe(budget?.hasIncome ? budget.income : null);
  expect(snap.monthlyEssentialSpendGbp).toBe(cover?.monthlyEssentials ?? null);
  expect(snap.monthlySurplusAfterStoredMinimumsGbp).toBe(budget?.hasIncome ? budget.surplus : null);
  expect(snap.emergencyRunwayMonths).toBe(cover?.months ?? null);

  const b = ((await h.callJson("get_budget_summary")) as Envelope<BudgetResult>).result;
  expect(b.monthlyIncomeGbp).toBe(budget?.hasIncome ? budget.income : null);
  expect(b.essentialMonthlyGbp).toBe(budget?.essentials ?? 0);
  expect(b.discretionaryMonthlyGbp).toBe(budget?.discretionary ?? 0);
  expect(b.savingsMonthlyGbp).toBe(budget?.savings ?? 0);
  expect(b.monthlySurplusBeforeDebtGbp).toBe(budget?.hasIncome ? budget.surplus : null);
  // Categories add up to the three spending totals, give or take a penny per category from
  // rounding each category to the penny.
  const categorySum = b.categories.reduce((s, c) => s + c.monthlyGbp, 0);
  const spending =
    (budget?.essentials ?? 0) + (budget?.discretionary ?? 0) + (budget?.savings ?? 0);
  expect(Math.abs(categorySum - spending)).toBeLessThanOrEqual(0.01 * b.categories.length + 1e-9);

  const d = ((await h.callJson("get_debt_overview")) as Envelope<DebtResult>).result;
  expect(d.totalConsumerDebtGbp).toBe(round2(picture.debt.consumerDebt));
  expect(d.totalMinimumPaymentsGbp).toBe(picture.debt.monthlyMinimums);
  expect(d.mortgageGbp).toBe(round2(picture.debt.mortgage));
  expect(d.studentLoanGbp).toBe(round2(picture.debt.studentLoans));
  expect(d.debtFreeDateOnMinimums).toBe(picture.debtSummary?.debtFreeDate ?? null);
}

describe.each(NAMES)("persona %s: AI read tools match the loaded picture", (name) => {
  const { fixture } = PERSONAS[name];
  const input = {
    baseline: BASELINE,
    profileFacts: fixture.profile,
    netWorthBasis: fixture.netWorthBasis,
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

  it("snapshot, budget summary and debt overview", async () => {
    const { picture } = await loadFinancialPicture(inMemoryPictureSource(input), {
      asOf: new Date(),
    });
    // The loader reaches the same picture as building straight from the fixture.
    expect(picture.netWorth).toEqual(buildFinancialPicture(fixture).netWorth);
    expect(picture.budget).toEqual(buildFinancialPicture(fixture).budget);
    await expectToolsMatchPicture(h, picture);
  });

  it("context pack and project_net_worth start: the picture's figures", async () => {
    const asOf = new Date();
    const { picture } = await loadFinancialPicture(inMemoryPictureSource(input), { asOf });
    // The pack builds its own picture from the same rows; every shared figure must agree.
    const pack = buildFlumpAiContextPack(input, { asOf });
    const totals = isFigureKnown(picture.budget) ? picture.budget.value : null;
    expect(pack.budgetSummary.monthlySurplus).toBe(totals?.hasIncome ? totals.surplus : null);
    expect(pack.budgetSummary.emergencyRunwayMonths).toBe(
      isFigureKnown(picture.monthsOfCover) ? picture.monthsOfCover.value.months : null,
    );
    expect(pack.portfolio.netWorth).toBe(picture.netWorth.netWorth);
    // All consumer debt, overdrawn current accounts included, as get_debt_overview gives it.
    expect(pack.debtSummary.totalStartingDebtGbp).toBe(
      Math.round(picture.debt.consumerDebt * 100) / 100,
    );
    expect(pack.debtSummary.debtFreeDate).toBe(picture.debtSummary?.debtFreeDate ?? null);
    expect(pack.isaAllowance.usedGbp).toBe(picture.isaAllowanceUsed);
    expect(pack.portfolio.weightedSavingsRate).toBe(picture.savings.weightedRate);
    // The last history month is the current month at the picture's net worth.
    const lastPoint = pack.portfolio.monthlyHistory.at(-1);
    if (lastPoint) expect(lastPoint.netWorth).toBeCloseTo(picture.netWorth.netWorth, 6);

    const e = (await h.callJson("project_net_worth", { expectedReturnPct: 5 })) as Envelope<{
      startingNetWorthGbp: number;
      points: Array<{ year: number; baselineNetWorthGbp: number }>;
    }>;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    expect(e.result.startingNetWorthGbp).toBe(round2(picture.netWorth.netWorth));
    expect(e.result.points[0]?.baselineNetWorthGbp).toBe(round2(picture.netWorth.netWorth));
  });

  it("get_tax_year_position: the current year's Self Assessment estimate is the picture's", async () => {
    const { picture } = await loadFinancialPicture(inMemoryPictureSource(input), {
      asOf: new Date(),
    });
    const e = (await h.callJson("get_tax_year_position", {})) as Envelope<{
      estimate: { selfAssessmentGbp: number };
    }>;
    const due = picture.estimatedTaxDue;
    if (isFigureKnown(due)) {
      expect(e.taxYear).toBe(due.value.taxYear);
      // The picture keeps whole pounds; the tool reports pence.
      expect(Math.round(e.result.estimate.selfAssessmentGbp)).toBe(due.value.amount);
    } else {
      // Unknown on the Dashboard: the tool names the same missing fact rather than a bare figure.
      const fields = (e.missing ?? []).map((m) => m.field);
      for (const key of due.missing) expect(fields).toContain(key);
    }
  });
});

describe("overdrawn current account only: the pack and get_debt_overview agree", () => {
  // One current account at -£500 and no debt accounts. The overdrawn £500 is consumer debt
  // (portfolio.totalConsumerDebt), so both surfaces give 500, never 0.
  const input = {
    baseline: BASELINE,
    profileFacts: PERSONAS[NAMES[0] as PersonaName].fixture.profile,
    netWorthBasis: { countProperty: true, countStudentLoan: false },
    accounts: [{ id: "cur", name: "Current", type: "Current", balance: -500 }],
    accountDetails: [],
    budgetEntries: [],
    taxRecords: [],
  };
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(input);
  });
  afterAll(async () => h.close());

  it("both give £500", async () => {
    const pack = buildFlumpAiContextPack(input, { asOf: new Date() });
    expect(pack.debtSummary.totalStartingDebtGbp).toBe(500);
    const d = ((await h.callJson("get_debt_overview")) as Envelope<DebtResult>).result;
    expect(d.totalConsumerDebtGbp).toBe(500);
  });
});

describe("BU-3 worked example: the AI tools give the Dashboard's left over and Breathing room", () => {
  // Cash £6,000; card £2,000 at 20% APR with a saved £100 minimum. Budget: income £2,500, rent
  // £900, food £300, savings £200 (saved as essential), card payment £100 in "debt" (essential).
  const input = {
    baseline: BASELINE,
    profileFacts: PERSONAS[NAMES[0] as PersonaName].fixture.profile,
    netWorthBasis: { countProperty: true, countStudentLoan: false },
    accounts: [
      { id: "cur", name: "Current", type: "Current", balance: 6000 },
      {
        id: "card",
        name: "Card",
        type: "Credit Card",
        balance: -2000,
        interestRate: 20,
        monthlyContribution: 100,
      },
    ],
    accountDetails: [],
    budgetEntries: [
      {
        id: "i",
        category: "income",
        name: "Pay",
        amount: 2500,
        frequency: "monthly",
        isIncome: true,
        isEssential: false,
      },
      {
        id: "r",
        category: "housing",
        name: "Rent",
        amount: 900,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
      {
        id: "f",
        category: "food",
        name: "Food",
        amount: 300,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
      {
        id: "s",
        category: "savings",
        name: "Saver",
        amount: 200,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
      {
        id: "d",
        category: "debt",
        name: "Card",
        amount: 100,
        frequency: "monthly",
        isIncome: false,
        isEssential: true,
      },
    ],
    taxRecords: [],
  };
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(input);
  });
  afterAll(async () => h.close());

  it("uses the hand-worked figures", async () => {
    // Left over: 2,500 - essentials (900 + 300 + 100 = 1,300) - savings 200 = 1,000. The card's
    // £100 minimum is the same payment as the debt row, so it is not taken off again.
    // Breathing room essentials: rent and food 1,200, plus the larger of the saved minimum (100)
    // and the debt row (100), plus the essential savings row 200 (owner item 28: a saving the
    // person would keep paying) = 1,500. 6,000 / 1,500 = 4.0 months.
    const snap = ((await h.callJson("get_financial_snapshot")) as Envelope<SnapshotResult>).result;
    expect(snap.monthlySurplusAfterStoredMinimumsGbp).toBe(1000);
    expect(snap.monthlyEssentialSpendGbp).toBe(1500);
    expect(snap.emergencyRunwayMonths).toBe(4);
    // Net worth 6,000 - 2,000 = 4,000.
    expect(snap.netWorthGbp).toBe(4000);

    // Budget summary: essentials 1,300 (the debt row is essential), flexible 0, savings 200;
    // categories 900 + 300 + 200 + 100 = 1,500 = 1,300 + 0 + 200.
    const b = ((await h.callJson("get_budget_summary")) as Envelope<BudgetResult>).result;
    expect(b.essentialMonthlyGbp).toBe(1300);
    expect(b.discretionaryMonthlyGbp).toBe(0);
    expect(b.savingsMonthlyGbp).toBe(200);
    expect(b.monthlySurplusBeforeDebtGbp).toBe(1000);
    expect(b.categories.reduce((s, c) => s + c.monthlyGbp, 0)).toBe(1500);

    // Debt overview: £2,000 owed, £100 of minimums. The date is the picture's minimum-only date.
    const d = ((await h.callJson("get_debt_overview")) as Envelope<DebtResult>).result;
    expect(d.totalConsumerDebtGbp).toBe(2000);
    expect(d.totalMinimumPaymentsGbp).toBe(100);
    expect(d.debtFreeDateOnMinimums).not.toBeNull();

    const { picture } = await loadFinancialPicture(inMemoryPictureSource(input), {
      asOf: new Date(),
    });
    await expectToolsMatchPicture(h, picture);
  });
});

/**
 * Linked budget lines (budget_entries.link_kind, PR 783): each stores £0 and takes its figure from
 * the saved fact. Salary £12,570 is the personal allowance and the NI primary threshold, with no
 * pension and no student loan, so take-home is 12,570 / 12 = 1,047.50, which the take-home
 * figure gives in whole pounds: 1,048. Rent is saved as £850 a month.
 */
function linkedInput(annualSalary: number | null) {
  const row = (
    id: string,
    category: string,
    name: string,
    amount: number,
    extra: Record<string, unknown> = {},
  ) => ({
    id,
    category,
    name,
    amount,
    frequency: "monthly",
    isIncome: false,
    isEssential: false,
    ...extra,
  });
  return {
    baseline: BASELINE,
    profileFacts: {
      annualSalary,
      employmentType: "employed" as const,
      taxRegion: "ENGLAND" as const,
      studentLoanPlans: [],
      pensionPercent: 0,
      isSalarySacrifice: false,
      housingStatus: "renting" as const,
      monthlyHousingCost: 850,
    },
    netWorthBasis: { countProperty: true, countStudentLoan: false },
    accounts: [{ id: "cur", name: "Current", type: "Current", balance: 5000 }],
    accountDetails: [],
    budgetEntries: [
      row("pay", "income", "Take-home pay", 0, { isIncome: true, linkKind: "take_home" }),
      row("rent", "housing", "Rent", 0, { isEssential: true, linkKind: "housing" }),
      row("food", "food", "Groceries", 300, { isEssential: true }),
      row("fun", "entertainment", "Going out", 100),
    ],
    taxRecords: [],
  } as Parameters<typeof connectTestClient>[0];
}

describe("linked budget lines: the AI tools count the saved fact, never the stored £0", () => {
  let h: TestHarness;
  afterEach(async () => h?.close());

  it("salary and rent saved: the tools give the hand-worked figures and match the picture", async () => {
    const input = linkedInput(12570);
    h = await connectTestClient(input);
    // Income 1,048 (take-home). Essentials: rent 850 (saved) + groceries 300 = 1,150.
    // Discretionary 100. Left over = 1,048 - 1,150 - 100 = -202.
    const b = ((await h.callJson("get_budget_summary")) as Envelope<BudgetResult>).result;
    expect(b.monthlyIncomeGbp).toBe(1048);
    expect(b.essentialMonthlyGbp).toBe(1150);
    expect(b.discretionaryMonthlyGbp).toBe(100);
    expect(b.monthlySurplusBeforeDebtGbp).toBe(-202);
    // Breathing room: cash 5,000 / essentials 1,150 = 4.347..., shown as 4.3 months.
    const snap = ((await h.callJson("get_financial_snapshot")) as Envelope<SnapshotResult>).result;
    expect(snap.monthlySurplusAfterStoredMinimumsGbp).toBe(-202);
    expect(snap.monthlyEssentialSpendGbp).toBe(1150);
    expect(snap.emergencyRunwayMonths).toBe(4.3);

    const { picture } = await loadFinancialPicture(inMemoryPictureSource(input), {
      asOf: new Date(),
    });
    await expectToolsMatchPicture(h, picture);
  });

  it("2027/28 Plan 1: the budget tools say the linked take-home leaves the loan out", async () => {
    // Fixed date in tax year 2027/28, when the Plan 1 threshold is not published (refused).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-05-01T12:00:00Z"));
    try {
      const input = linkedInput(40000);
      (input.profileFacts as { studentLoanPlans: string[] }).studentLoanPlans = ["PLAN_1"];
      h = await connectTestClient(input);
      const notice =
        "The 2027/28 repayment threshold for this student loan plan is not published yet, so repayments are not included.";
      const reasons = (e: { assumptions: Array<{ reason?: string }> }) =>
        e.assumptions.map((a) => a.reason);
      const b = (await h.callJson("get_budget_summary")) as Envelope<BudgetResult>;
      expect(b.result.monthlyIncomeGbp).not.toBeNull();
      expect(reasons(b)).toContain(notice);
      const snap = (await h.callJson("get_financial_snapshot")) as Envelope<SnapshotResult>;
      expect(reasons(snap)).toContain(notice);
      const proj = (await h.callJson("project_net_worth", {
        horizonYears: 5,
        expectedReturnPct: 5,
      })) as Envelope<unknown>;
      expect(reasons(proj)).toContain(notice);
    } finally {
      vi.useRealTimers();
    }
  });

  it("no salary saved: income and left over are not set, spending is still the saved lines", async () => {
    h = await connectTestClient(linkedInput(null));
    const b = (await h.callJson("get_budget_summary")) as Envelope<BudgetResult>;
    expect(b.result.monthlyIncomeGbp).toBeNull();
    expect(b.result.monthlySurplusBeforeDebtGbp).toBeNull();
    // Essentials 850 + 300 = 1,150 and discretionary 100: the take-home line is the only one
    // without a figure, so the spending lines still count. Never a £0 income.
    expect(b.result.essentialMonthlyGbp).toBe(1150);
    expect(b.result.discretionaryMonthlyGbp).toBe(100);
    expect((b.missing ?? []).map((m) => m.field)).toContain("salary");

    const snap = (await h.callJson("get_financial_snapshot")) as Envelope<SnapshotResult>;
    expect(snap.result.monthlyIncomeGbp).toBeNull();
    expect(snap.result.monthlySurplusAfterStoredMinimumsGbp).toBeNull();
    // Breathing room does not use income, so it stays known: 5,000 / 1,150 = 4.3 months.
    expect(snap.result.emergencyRunwayMonths).toBe(4.3);
  });
});
