import type { BuildContextPackInput } from "@flump/finance-engine";
import { profileFactsFromProfile } from "@flump/finance-engine";
import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../../testing/client.js";
import { emptyUser } from "../../testing/personas.js";

type Point = {
  year: number;
  baselineNetWorthGbp: number;
  scenarioNetWorthGbp: number;
  cashGbp?: number;
  investmentsGbp?: number;
  pensionGbp?: number;
  propertyEquityGbp?: number;
  debtGbp?: number;
};
type Env = {
  result: {
    startingNetWorthGbp: number;
    endBaselineNetWorthGbp: number;
    endScenarioNetWorthGbp: number;
    eventsApplied: Array<Record<string, unknown>>;
    points: Point[];
    notes: string[];
  };
  provenance: Record<string, string>;
  assumptions: Array<{ field: string; value?: unknown; source: string; reason: string }>;
  missing: Array<{ field: string; why: string; askUser: string }>;
};

type Accounts = NonNullable<BuildContextPackInput["accounts"]>;
const acc = (id: string, type: string, balance: number, extra: Record<string, unknown> = {}) => ({
  id,
  name: `Test ${type}`,
  type,
  balance,
  ...extra,
});

const user = (
  accounts: Accounts,
  over: Partial<BuildContextPackInput> = {},
): BuildContextPackInput => ({ ...emptyUser, accounts, ...over });

const entry = (over: Record<string, unknown>) => ({
  id: "e",
  category: "bills",
  name: "Entry",
  amount: 0,
  frequency: "monthly",
  isIncome: false,
  isEssential: true,
  ...over,
});

const PROPERTY_NOTE = "Property and mortgages are not counted";
const STUDENT_LOAN_NOTE = "Student loans are not counted";
const HOME_VALUE_NOTE = "A mortgage has no home value saved";
const HELD_FLAT_NOTE = "of today's net worth";

const shape = (a: Env["assumptions"]) =>
  a.map(({ field, value, source }) => ({ field, value, source }));

describe("project_net_worth behaviour", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });
  const call = async (args: Record<string, unknown>) =>
    (await h?.callJson("project_net_worth", args)) as Env;
  const oneYear = { expectedReturnPct: 5, monthlySavingGbp: 0, horizonYears: 1 };

  describe("growth rates", () => {
    const fourPots = user([
      acc("cash", "Current", 10000),
      acc("isa", "ISA", 10000),
      acc("pen", "Pension", 10000),
      acc("home", "Property", 100000),
    ]);

    it("grows each balance for a year at the stated default rates", async () => {
      // Cash 10,000 x 1.04 = 10,400; investments 10,000 x 1.05 = 10,500 (the return supplied);
      // pension 10,000 x 1.065 = 10,650; home 100,000 x 1.025 = 102,500.
      // Net worth: 130,000 at the start; 10,400 + 10,500 + 10,650 + 102,500 = 134,050 after a year.
      h = await connectTestClient(fourPots);
      const e = await call({ ...oneYear, responseFormat: "detailed" });
      expect(e.result.startingNetWorthGbp).toBe(130000);
      expect(e.result.points[1]).toEqual({
        year: 1,
        baselineNetWorthGbp: 134050,
        scenarioNetWorthGbp: 134050,
        cashGbp: 10400,
        investmentsGbp: 10500,
        pensionGbp: 10650,
        propertyEquityGbp: 102500,
        debtGbp: 0,
      });
      expect(e.result.endBaselineNetWorthGbp).toBe(134050);
      expect(e.result.endScenarioNetWorthGbp).toBe(134050);
      expect(shape(e.assumptions)).toEqual([
        { field: "horizonYears", value: 1, source: "agent_supplied" },
        { field: "expectedReturnPct", value: 5, source: "agent_supplied" },
        { field: "monthlySavingGbp", value: 0, source: "agent_supplied" },
        { field: "cashInterestPct", value: 4, source: "default" },
        { field: "pensionReturnPct", value: 6.5, source: "default" },
        { field: "propertyGrowthPct", value: 2.5, source: "default" },
      ]);
      expect(e.missing).toEqual([]);
      // Nothing is left out or held flat, so only the two standing notes appear.
      expect(e.result.notes).toHaveLength(2);
      expect(e.result.notes.join(" ")).toContain("£20,000");
      expect(e.result.notes.join(" ")).toContain("inflation");
      expect(e.provenance.points).toBe("account_balances");
    });

    it("uses supplied rates in place of the defaults", async () => {
      // Cash 10,000 x 1.03 = 10,300; investments 10,500; pension 10,000 x 1.05 = 10,500;
      // home 100,000 x 1.02 = 102,000. Total 10,300 + 10,500 + 10,500 + 102,000 = 133,300.
      h = await connectTestClient(fourPots);
      const e = await call({
        ...oneYear,
        cashInterestPct: 3,
        pensionReturnPct: 5,
        propertyGrowthPct: 2,
      });
      expect(e.result.endBaselineNetWorthGbp).toBe(133300);
      expect(shape(e.assumptions).slice(3)).toEqual([
        { field: "cashInterestPct", value: 3, source: "agent_supplied" },
        { field: "pensionReturnPct", value: 5, source: "agent_supplied" },
        { field: "propertyGrowthPct", value: 2, source: "agent_supplied" },
      ]);
    });
  });

  describe("monthly saving and pension contributions", () => {
    it("adds the saved pension contribution from salary and percentage", async () => {
      // Salary £24,000 at 5%: 24,000 x 5% / 12 = £100 a month, £1,200 a year.
      // Pension after a year: (0 + 1,200) x 1.065 = 1,278. Cash 1,000 x 1.04 = 1,040.
      // Net worth 1,040 + 1,278 = 2,318.
      h = await connectTestClient(
        user([acc("cash", "Current", 1000)], {
          baseline: { ...emptyUser.baseline, annualGrossSalary: 24000, pensionContributionPct: 5 },
        }),
      );
      const e = await call({ ...oneYear, responseFormat: "detailed" });
      expect(e.result.points[1]?.pensionGbp).toBe(1278);
      expect(e.result.endBaselineNetWorthGbp).toBe(2318);
      expect(e.assumptions).toContainEqual(
        expect.objectContaining({
          field: "monthlyPensionContributionGbp",
          value: 100,
          source: "user_profile",
        }),
      );
    });

    it("uses a supplied monthly saving", async () => {
      // £500 a month = £6,000 a year, all to investments: 6,000 x 1.05 = 6,300. Cash 1,000 x 1.04
      // = 1,040. Net worth 7,340.
      h = await connectTestClient(user([acc("cash", "Current", 1000)]));
      const e = await call({ ...oneYear, monthlySavingGbp: 500 });
      expect(e.result.endBaselineNetWorthGbp).toBe(7340);
      expect(e.assumptions).toContainEqual(
        expect.objectContaining({
          field: "monthlySavingGbp",
          value: 500,
          source: "agent_supplied",
        }),
      );
      expect(e.missing).toEqual([]);
    });

    it("saves the amount left over in the budget when no saving is supplied", async () => {
      // Income £3,000 and spending £1,000 a month: £2,000 left over, £24,000 a year.
      // £20,000 goes to investments (the yearly cap): 20,000 x 1.05 = 21,000.
      // The other £4,000 goes to cash: (1,000 + 4,000) x 1.04 = 5,200. Net worth 26,200.
      h = await connectTestClient(
        user([acc("cash", "Current", 1000)], {
          budgetEntries: [
            entry({ id: "pay", category: "income", name: "Pay", isIncome: true, amount: 3000 }),
            entry({ id: "bills", name: "Bills", amount: 1000 }),
          ],
        }),
      );
      const e = await call({ expectedReturnPct: 5, horizonYears: 1 });
      expect(e.result.endBaselineNetWorthGbp).toBe(26200);
      expect(e.assumptions).toContainEqual(
        expect.objectContaining({ field: "monthlySavingGbp", value: 2000, source: "derived" }),
      );
      expect(e.result.notes.join(" ")).not.toContain("short each month");
    });

    it("does not call a budget that exactly balances short", async () => {
      // Income £1,000 and spending £1,000: nothing left over and nothing short.
      h = await connectTestClient(
        user([acc("cash", "Current", 1000)], {
          budgetEntries: [
            entry({ id: "pay", category: "income", name: "Pay", isIncome: true, amount: 1000 }),
            entry({ id: "bills", name: "Bills", amount: 1000 }),
          ],
        }),
      );
      const e = await call({ expectedReturnPct: 5, horizonYears: 1 });
      expect(e.assumptions).toContainEqual(
        expect.objectContaining({ field: "monthlySavingGbp", value: 0, source: "derived" }),
      );
      expect(e.result.notes.join(" ")).not.toContain("short each month");
    });

    it("lists a linked budget line with no saved figure, and the saving, as missing", async () => {
      // A housing row linked to the saved rent, with no rent saved: the budget is unknown.
      h = await connectTestClient(
        user([acc("cash", "Current", 1000)], {
          profileFacts: { ...profileFactsFromProfile(null), housingStatus: "renting" },
          budgetEntries: [
            entry({ id: "pay", category: "income", name: "Pay", isIncome: true, amount: 2000 }),
            entry({ id: "rent", category: "housing", name: "Rent", linkKind: "housing" }),
          ],
        }),
      );
      const e = await call({ expectedReturnPct: 5, horizonYears: 1 });
      expect(e.missing.map((m) => m.field)).toEqual(["monthlyHousingCost", "monthlySavingGbp"]);
      const saving = e.missing[1];
      expect(saving?.why).toContain("zero saving");
      expect(saving?.askUser).toContain("monthly saving");
    });

    it("asks for the salary when a pension rate is saved without one", async () => {
      // A 5% rate and no salary: the contribution in pounds is unknown, so it is left out and the
      // salary is asked for. Saving is supplied, so nothing else is missing.
      h = await connectTestClient(
        user([acc("cash", "Current", 1000)], {
          profileFacts: { ...profileFactsFromProfile(null), pensionPercent: 5 },
        }),
      );
      const e = await call(oneYear);
      expect(e.missing.map((m) => m.field)).toEqual(["salary"]);
    });

    it("asks for the salary once when both the take-home line and the pension rate need it", async () => {
      // Two rules want the salary here. The income row is linked to take-home pay and no salary is
      // saved, so the budget lists "salary" as missing. A 5% pension rate is saved with no salary,
      // so the pension rule wants "salary" too. Each missing input is asked for once, so the list
      // holds one "salary" entry, then the saving (none supplied, and the budget has no known income).
      h = await connectTestClient(
        user([acc("cash", "Current", 1000)], {
          profileFacts: { ...profileFactsFromProfile(null), pensionPercent: 5 },
          budgetEntries: [
            entry({
              id: "pay",
              category: "income",
              name: "Pay",
              isIncome: true,
              linkKind: "take_home",
            }),
          ],
        }),
      );
      const e = await call({ expectedReturnPct: 5, horizonYears: 1 });
      expect(e.missing.map((m) => m.field)).toEqual(["salary", "monthlySavingGbp"]);
      expect(e.missing.filter((m) => m.field === "salary")).toHaveLength(1);
    });
  });

  describe("property and events", () => {
    it("starts property equity at the home's value less the mortgage", async () => {
      // Home 300,000 less mortgage 200,000 = 100,000 equity; after a year 100,000 x 1.025 = 102,500.
      h = await connectTestClient(
        user([
          acc("home", "Property", 300000),
          acc("mort", "Mortgage", 200000, { interestRate: 4 }),
        ]),
      );
      const e = await call({ ...oneYear, responseFormat: "detailed" });
      expect(e.result.points.map((p) => p.propertyEquityGbp)).toEqual([100000, 102500]);
    });

    it("turns a one-off cost into property equity when it buys property", async () => {
      // Cash 20,000; a £10,000 purchase in year 1. Baseline: 20,000 x 1.04 = 20,800.
      // Scenario: cash 10,000 x 1.04 = 10,400 plus equity 10,000 x 1.025 = 10,250 = 20,650.
      h = await connectTestClient(user([acc("cash", "Current", 20000)]));
      const e = await call({
        ...oneYear,
        events: [
          { label: "Flat", startYear: 1, lumpSumCostGbp: 10000, becomesPropertyEquity: true },
        ],
      });
      expect(e.result.endBaselineNetWorthGbp).toBe(20800);
      expect(e.result.endScenarioNetWorthGbp).toBe(20650);
    });

    it("echoes how long a monthly cost lasts", async () => {
      h = await connectTestClient(user([acc("cash", "Current", 20000)]));
      const e = await call({
        ...oneYear,
        events: [{ label: "Nursery", startYear: 1, durationYears: 3, monthlyCostGbp: 100 }],
      });
      expect(e.result.eventsApplied).toEqual([
        {
          label: "Nursery",
          startYear: 1,
          durationYears: 3,
          lumpSumCostGbp: 0,
          monthlyCostGbp: 100,
        },
      ]);
    });
  });

  describe("notes on what the estimate leaves out", () => {
    const hasNote = (e: Env, text: string) => e.result.notes.some((n) => n.includes(text));
    const notCounted = { countProperty: false, countStudentLoan: false };

    it("notes a home left out of net worth by the user's choice", async () => {
      h = await connectTestClient(
        user([acc("home", "Property", 300000), acc("cash", "Current", 1000)], {
          netWorthBasis: notCounted,
        }),
      );
      expect(hasNote(await call(oneYear), PROPERTY_NOTE)).toBe(true);
    });

    it("notes a mortgage left out of net worth by the user's choice", async () => {
      h = await connectTestClient(
        user([acc("mort", "Mortgage", 100000, { interestRate: 4 }), acc("cash", "Current", 1000)], {
          netWorthBasis: notCounted,
        }),
      );
      expect(hasNote(await call(oneYear), PROPERTY_NOTE)).toBe(true);
    });

    it("adds no property note when there is no property or mortgage", async () => {
      h = await connectTestClient(
        user([acc("cash", "Current", 1000)], { netWorthBasis: notCounted }),
      );
      const e = await call(oneYear);
      expect(hasNote(e, PROPERTY_NOTE)).toBe(false);
      expect(e.result.notes).toHaveLength(2);
    });

    it("adds no property note when property is counted", async () => {
      h = await connectTestClient(
        user([acc("home", "Property", 300000), acc("cash", "Current", 1000)], {
          netWorthBasis: { countProperty: true, countStudentLoan: false },
        }),
      );
      expect(hasNote(await call(oneYear), PROPERTY_NOTE)).toBe(false);
    });

    it("notes a student loan left out of net worth by the user's choice", async () => {
      h = await connectTestClient(
        user([acc("cash", "Current", 1000), acc("sl", "Student Loan", 25000)], {
          netWorthBasis: notCounted,
        }),
      );
      expect(hasNote(await call(oneYear), STUDENT_LOAN_NOTE)).toBe(true);
    });

    it("adds no student loan note when the loan is counted", async () => {
      h = await connectTestClient(
        user([acc("cash", "Current", 1000), acc("sl", "Student Loan", 25000)], {
          netWorthBasis: { countProperty: true, countStudentLoan: true },
        }),
      );
      expect(hasNote(await call(oneYear), STUDENT_LOAN_NOTE)).toBe(false);
    });

    it("notes a mortgage with no home value beside it", async () => {
      h = await connectTestClient(
        user([acc("mort", "Mortgage", 100000, { interestRate: 4 }), acc("cash", "Current", 1000)], {
          netWorthBasis: { countProperty: true, countStudentLoan: false },
        }),
      );
      expect(hasNote(await call(oneYear), HOME_VALUE_NOTE)).toBe(true);
    });

    it("states a positive amount held flat in pounds", async () => {
      // A £12,500 vehicle counts in net worth but is not modelled, so it is held at £12,500.
      h = await connectTestClient(user([acc("car", "Vehicle", 12500)]));
      const e = await call(oneYear);
      const note = e.result.notes.find((n) => n.includes(HELD_FLAT_NOTE));
      expect(note?.startsWith("£12,500 ")).toBe(true);
    });

    it("states a negative amount held flat with a minus sign", async () => {
      // A counted £25,000 student loan is not modelled, so -£25,000 is held flat.
      h = await connectTestClient(
        user([acc("cash", "Current", 1000), acc("sl", "Student Loan", 25000)], {
          netWorthBasis: { countProperty: true, countStudentLoan: true },
        }),
      );
      const e = await call(oneYear);
      const note = e.result.notes.find((n) => n.includes(HELD_FLAT_NOTE));
      expect(note?.startsWith("-£25,000 ")).toBe(true);
    });
  });
});
