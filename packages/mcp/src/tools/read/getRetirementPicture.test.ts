import {
  type BuildContextPackInput,
  MCP_NOTICE,
  profileFactsFromProfile,
} from "@flump/finance-engine";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectTestClient, TEST_TOKEN } from "../../testing/client.js";
import { createFakeProvider } from "../../testing/fake-provider.js";
import { emptyUser } from "../../testing/personas.js";
import type { McpServerContext } from "../../types.js";
import { runRetirementPlan } from "./getRetirementPicture.js";

type Env = {
  result: Record<string, unknown> & {
    monthlySeries: Array<{
      month: string;
      totalCountedGbp: number;
      changeFromPreviousGbp: number | null;
    }>;
    notes: string[];
  };
  missing: Array<{ field: string; why: string; askUser: string }>;
  assumptions: Array<{ field: string; value?: unknown; source: string; reason?: string }>;
};

const FULL = { ...TEST_TOKEN, scopes: ["mcp:read:full", "mcp:simulate"] as never };

// Age 60 this year, whatever year the test runs in.
const birthYear = new Date().getUTCFullYear() - 60;

const PLAN = {
  retirementAge: 60,
  planToAge: 80,
  target: { kind: "typed", yearlyAmount: 20_000 },
  housingOverride: null,
  statePensionAge: 67,
  statePensionAnnualForecastGbp: 11_000,
  statePensionQualifyingYears: null,
  growthRates: { lower: 0.03, middle: 0.04, higher: 0.06 },
  inflationRate: 0.025,
  cashSavingsNominalRate: 0.02,
  realRentGrowthRate: 0,
  excludedAccountIds: [],
};

const saver: BuildContextPackInput = {
  ...emptyUser,
  birthYear,
  accounts: [{ id: "pen", name: "Work pension", type: "Pension", balance: 100_000 }],
  retirementPlan: PLAN as never,
};

async function picture(data: BuildContextPackInput, args: Record<string, unknown> = {}) {
  const h = await connectTestClient(data, { token: FULL });
  try {
    return (await h.callJson("get_retirement_picture", args)) as Env;
  } finally {
    await h.close();
  }
}

const expectAsked = (e: Env) => {
  for (const m of e.missing) {
    expect(m.why.length, m.field).toBeGreaterThan(0);
    expect(m.askUser.length, m.field).toBeGreaterThan(0);
  }
};

describe("get_retirement_picture: missing details", () => {
  it("with nothing saved asks for accounts, birth year, retirement age and plan-to age", async () => {
    const e = await picture(emptyUser);
    expect(e.missing.map((m) => m.field)).toEqual([
      "accounts",
      "birthYear",
      "retirementAge",
      "planToAge",
    ]);
    expectAsked(e);
    expect(e.assumptions.find((a) => a.field === "growthRates")?.source).toBe("default");
  });

  it("asks for the State Pension details and the target when the plan runs without them", async () => {
    const e = await picture({
      ...saver,
      retirementPlan: {
        ...PLAN,
        target: null,
        statePensionAge: null,
        statePensionAnnualForecastGbp: null,
      } as never,
    });
    expect(e.missing.map((m) => m.field)).toEqual([
      "statePensionAge",
      "statePensionAmount",
      "targetYearlyGbp",
    ]);
    expectAsked(e);
    expect(e.result.targetYearlyIncomeGbp).toBeNull();
    expect(e.result.statePensionIncluded).toBe(false);
  });
});

describe("get_retirement_picture: the saved plan", () => {
  it("includes the State Pension and says the rates come from the profile", async () => {
    const e = await picture(saver);
    expect(e.missing).toEqual([]);
    expect(e.result.statePensionIncluded).toBe(true);
    expect(e.result.targetYearlyIncomeGbp).toBe(20_000);
    const rates = e.assumptions.find((a) => a.field === "growthRates");
    expect(rates?.source).toBe("user_profile");
    expect(rates?.reason?.length).toBeGreaterThan(0);
    // The saved retirement age (60) is not below the current age (60), so nothing was adjusted.
    // Income tax adds its two assumptions: the year, region and method, and what is untaxed.
    expect(e.assumptions.map((a) => a.field)).toEqual([
      "growthRates",
      "incomeTax",
      "untaxedWithdrawals",
    ]);
    const tax = e.assumptions.find((a) => a.field === "incomeTax");
    expect(tax?.source).toBe("default");
    expect(tax?.reason).toContain(
      "No tax region is saved, so England, Wales and Northern Ireland bands are assumed.",
    );
    expect(e.assumptions.find((a) => a.field === "untaxedWithdrawals")?.reason).toBe(
      "Not taxed in this estimate. Capital gains tax, dividend tax and tax on savings interest are not included.",
    );
    expect(e.result.notes).toHaveLength(2);
    expect(e.result.notes[0]).toBe(MCP_NOTICE);
    expect(e.result.notes[1]).toMatch(/today's prices/);
  });

  it("uses the current age, and says so, when the saved retirement age has passed", async () => {
    const e = await picture({ ...saver, retirementPlan: { ...PLAN, retirementAge: 55 } as never });
    // Age 60 now, so a saved retirement age of 55 is raised to 60.
    expect(e.result.retirementAge).toBe(60);
    const adjusted = e.assumptions.find((a) => a.field === "retirementAge");
    expect(adjusted).toMatchObject({ value: 60, source: "derived" });
    expect(adjusted?.reason?.length).toBeGreaterThan(0);
  });

  it("uses the stated retirement age, plan-to age and target for this answer", async () => {
    const e = await picture(saver, { retirementAge: 65, planToAge: 90, targetYearlyGbp: 15_000 });
    expect(e.result.retirementAge).toBe(65);
    expect(e.result.planToAge).toBe(90);
    expect(e.result.targetYearlyIncomeGbp).toBe(15_000);
  });
});

describe("get_retirement_picture: monthly series", () => {
  // A fixed mid-month clock (only Date is faked), so the months below and the tool's own idea of
  // "this month" cannot fall either side of a month boundary.
  beforeEach(() =>
    vi.useFakeTimers({ now: new Date("2026-11-15T12:00:00.000Z"), toFake: ["Date"] }),
  );
  afterEach(() => vi.useRealTimers());

  /** "YYYY-MM" year and month, `back` months before this month. */
  const monthsAgo = (back: number) => {
    const d = new Date();
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1));
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 };
  };

  it("starts with no change, then gives each month's change from the one before", async () => {
    const e = await picture({
      ...saver,
      accounts: [{ id: "pen", name: "Work pension", type: "Pension", balance: 13_000 }],
      accountDetails: [2, 1, 0].map((back, i) => ({
        accountId: "pen",
        ...monthsAgo(back),
        value: 11_000 + 1_000 * i,
      })),
    });
    const s = e.result.monthlySeries;
    // Three months recorded: 11,000, 12,000, 13,000. The first has nothing before it.
    expect(s.map((p) => p.totalCountedGbp)).toEqual([11_000, 12_000, 13_000]);
    expect(s.map((p) => p.changeFromPreviousGbp)).toEqual([null, 1_000, 1_000]);
  });

  it("keeps only the latest 12 months", async () => {
    const e = await picture({
      ...saver,
      accounts: [{ id: "pen", name: "Work pension", type: "Pension", balance: 15_000 }],
      accountDetails: Array.from({ length: 15 }, (_, i) => ({
        accountId: "pen",
        ...monthsAgo(14 - i),
        value: 1_000 * (i + 1),
      })),
    });
    const s = e.result.monthlySeries;
    // 15 months of 1,000 to 15,000; the last 12 are 4,000 to 15,000.
    expect(s).toHaveLength(12);
    expect(s[0]?.totalCountedGbp).toBe(4_000);
    expect(s[11]?.totalCountedGbp).toBe(15_000);
  });
});

describe("runRetirementPlan: rates when the plan cannot run", () => {
  const ctxFor = (data: BuildContextPackInput): McpServerContext => ({
    token: FULL,
    dataProvider: createFakeProvider(data),
  });
  // No birth year, so the engine cannot run the plan and the tool reports the rates itself.
  const noBirthYear = { ...saver, birthYear: undefined };

  it("reports the saved rates and inflation", async () => {
    const run = await runRetirementPlan(ctxFor(noBirthYear), {});
    expect(run.figures.currentAge).toBeNull();
    expect(run.figures.assumptions).toEqual({
      growthRates: { lower: 0.03, middle: 0.04, higher: 0.06 },
      inflationRate: 0.025,
      // The plan cannot run, so no tax year or region was used.
      withdrawalMethod: "ufpls",
      taxYear: null,
      taxRegion: null,
      taxRegionAssumed: true,
    });
  });

  it("lets stated rates and inflation replace the saved ones", async () => {
    const run = await runRetirementPlan(ctxFor(noBirthYear), {
      growthRates: { lower: 0.01, middle: 0.07, higher: 0.09 },
      inflationRate: 0.035,
    });
    expect(run.figures.assumptions).toEqual({
      growthRates: { lower: 0.01, middle: 0.07, higher: 0.09 },
      inflationRate: 0.035,
      withdrawalMethod: "ufpls",
      taxYear: null,
      taxRegion: null,
      taxRegionAssumed: true,
    });
  });

  it("falls back to the reference band when the saved plan has no rates", async () => {
    const run = await runRetirementPlan(
      ctxFor({ ...noBirthYear, retirementPlan: { ...PLAN, growthRates: null } as never }),
      {},
    );
    // Decision RD4: 2%, 5% and 8% until the user changes them.
    expect(run.figures.assumptions.growthRates).toEqual({
      lower: 0.02,
      middle: 0.05,
      higher: 0.08,
    });
  });

  it("lets stated inflation replace the saved one when the plan runs", async () => {
    const run = await runRetirementPlan(ctxFor(saver), { inflationRate: 0.035 });
    expect(run.figures.currentAge).toBe(60);
    expect(run.figures.assumptions.inflationRate).toBe(0.035);
  });
});

describe("income tax refused: a Scottish taxpayer in a year with no Scottish rates", () => {
  const SCOT_NOTICE =
    "Scottish Income Tax rates for 2027/28 are not published yet, so there is no estimate for this year.";
  const scot: BuildContextPackInput = {
    ...saver,
    profileFacts: profileFactsFromProfile({ taxRegion: "SCOTLAND" } as never),
  };
  const ctx: McpServerContext = { token: FULL, dataProvider: createFakeProvider(scot) };

  it("keeps the before-tax figures, nulls the after-tax ones and passes the notice", async () => {
    // June 2027 is in 2027/28, whose Scottish rates are not published.
    const run = await runRetirementPlan(ctx, {}, new Date("2027-06-01T12:00:00Z"));
    expect(run.figures.estimatedYearlyIncomeGbp).not.toBeNull();
    expect(run.figures.differenceYearlyGbp).not.toBeNull();
    expect(run.figures.estimatedYearlyIncomeAfterTaxGbp).toBeNull();
    expect(run.figures.estimatedIncomeTaxYearlyGbp).toBeNull();
    expect(run.figures.differenceYearlyAfterTaxGbp).toBeNull();
    expect(run.figures.incomeTaxNotice).toBe(SCOT_NOTICE);
    expect(run.figures.assumptions.taxYear).toBe("2027/28");
    expect(run.assumptions.find((a) => a.field === "incomeTax")?.reason).toBe(
      `${SCOT_NOTICE} Income figures are before tax and after-tax figures are null.`,
    );
  });

  it("both tools answer, with the notice in their notes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2027-06-01T12:00:00Z"));
    try {
      const h = await connectTestClient(scot, { token: FULL });
      try {
        for (const tool of ["get_retirement_picture", "simulate_retirement"]) {
          const e = (await h.callJson(tool, {})) as Env;
          expect(e.result.notes, tool).toContain(SCOT_NOTICE);
          expect(e.result.estimatedYearlyIncomeAfterTaxGbp, tool).toBeNull();
          expect(e.result.estimatedYearlyIncomeGbp, tool).not.toBeNull();
        }
      } finally {
        await h.close();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
