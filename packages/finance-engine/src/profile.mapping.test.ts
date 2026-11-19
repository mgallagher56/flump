import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FINANCIAL_BASELINE,
  decodeSeedPayload,
  encodeSeedPayload,
  financialBaselineToUserProfileUpdate,
  hydrateBaselineFromSeed,
  InMemoryProfileAdapter,
  normalizeEmploymentStatus,
  normalizeHousingStatus,
  normalizeStudentLoanPlan,
  scrambleSeedLegacy,
  unscrambleSeedLegacy,
  userProfileToFinancialBaseline,
  userProfileToSavedBaseline,
} from "./profile.js";
import type { FinancialBaseline, OnboardingSeedPayload } from "./types.js";

const toBaseline = userProfileToFinancialBaseline;

describe("DEFAULT_FINANCIAL_BASELINE", () => {
  it("assumes no user, PAYE, the England/NI/Wales rates, no student loan and net pay", () => {
    expect(DEFAULT_FINANCIAL_BASELINE.userId).toBe("");
    expect(DEFAULT_FINANCIAL_BASELINE.employmentStatus).toBe("PAYE");
    expect(DEFAULT_FINANCIAL_BASELINE.ukRegion).toBe("ENGLAND_NI_WALES");
    expect(DEFAULT_FINANCIAL_BASELINE.studentLoanPlan).toBe("NONE");
    // Salary sacrifice is never assumed (comment on the default).
    expect(DEFAULT_FINANCIAL_BASELINE.isSalarySacrifice).toBe(false);
    expect(DEFAULT_FINANCIAL_BASELINE.financialStage).toBe("STAGE_2_BUFFER_BUILD");
  });

  it("a seed with no tax fields keeps the default region and tax year", () => {
    const baseline = hydrateBaselineFromSeed({});
    expect(baseline.ukRegion).toBe("ENGLAND_NI_WALES");
    expect(baseline.taxYear).toBe("2025/26");
  });
});

describe("normalizeStudentLoanPlan spellings", () => {
  it("accepts the joined and underscored spelling of every plan", () => {
    expect(normalizeStudentLoanPlan("PLAN4")).toBe("PLAN_4");
    expect(normalizeStudentLoanPlan("Plan_5")).toBe("PLAN_5");
    expect(normalizeStudentLoanPlan("postgraduate")).toBe("POSTGRAD");
  });

  it("treats a run of spaces as one separator", () => {
    // "plan  2" upper-cased with each whitespace run replaced by one "_" is "PLAN_2".
    expect(normalizeStudentLoanPlan("plan  2")).toBe("PLAN_2");
  });
});

describe("normalizeEmploymentStatus spellings", () => {
  it("reads a missing status as PAYE and accepts self_employed with an underscore", () => {
    expect(normalizeEmploymentStatus(null)).toBe("PAYE");
    expect(normalizeEmploymentStatus("self_employed")).toBe("SELF_EMPLOYED");
  });
});

describe("normalizeHousingStatus spellings", () => {
  it("accepts ownoutright and owned as owning outright", () => {
    expect(normalizeHousingStatus("ownoutright")).toBe("OWN_OUTRIGHT");
    expect(normalizeHousingStatus("owned")).toBe("OWN_OUTRIGHT");
  });
});

describe("userProfileToFinancialBaseline: saved values and display defaults", () => {
  it("uses an empty user id when no id or fallback is given", () => {
    expect(toBaseline({}).userId).toBe("");
  });

  it("uses the 45,000 display salary when the salary is null or absent", () => {
    expect(toBaseline({ annualSalary: null }).annualGrossSalary).toBe(45000);
    expect(toBaseline({}).annualGrossSalary).toBe(45000);
  });

  it("reads absent unsecured debt as 0", () => {
    expect(toBaseline({}).totalUnsecuredDebt).toBe(0);
  });

  it("puts a salary of exactly 100,000 with no debt in the wealth stage", () => {
    // Rule: annualGrossSalary >= 100000 and no unsecured debt is STAGE_3.
    expect(toBaseline({ annualSalary: 100000 }).financialStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
  });

  it("keeps every known page and drops unknown ones", () => {
    const baseline = toBaseline({
      enabledPages: ["debt", "pension", "mortgage", "forecast", "nonsense"],
    });
    expect(baseline.enabledModules).toEqual(["debt", "pension", "mortgage", "forecast"]);
  });

  it("falls back to the default pages when none are saved or none are known", () => {
    const defaults = ["accounts", "budget", "pension", "forecast"];
    expect(toBaseline({}).enabledModules).toEqual(defaults);
    expect(toBaseline({ enabledPages: [] }).enabledModules).toEqual(defaults);
  });

  it("uses a saved age, and age 32 when age and birth year are null or absent", () => {
    expect(toBaseline({ age: 40 }).age).toBe(40);
    expect(toBaseline({ age: null }).age).toBe(32);
    expect(toBaseline({}).age).toBe(32);
  });

  it("passes a saved take-home through and leaves a null or absent one unset", () => {
    expect(toBaseline({ monthlyTakeHome: 2500 }).monthlyTakeHomeOverride).toBe(2500);
    expect(toBaseline({ monthlyTakeHome: null }).monthlyTakeHomeOverride).toBeUndefined();
    expect(toBaseline({}).monthlyTakeHomeOverride).toBeUndefined();
  });

  it("annualises second and rental income", () => {
    // (100 + 50) a month x 12 = 1,800 a year.
    const baseline = toBaseline({ secondIncomeMonthly: 100, rentalIncomeMonthly: 50 });
    expect(baseline.annualBonusOrSideIncome).toBe(1800);
  });

  it("presumes the 900 housing cost only for renting or a mortgage", () => {
    expect(toBaseline({ housingStatus: "renting" }).monthlyHousingCost).toBe(900);
    expect(toBaseline({ housingStatus: "mortgage" }).monthlyHousingCost).toBe(900);
    expect(toBaseline({ housingStatus: "own_outright" }).monthlyHousingCost).toBe(0);
  });

  it("uses a saved home value and 0 when none is saved", () => {
    expect(toBaseline({ homeValue: 300000 }).propertyValue).toBe(300000);
    expect(toBaseline({}).propertyValue).toBe(0);
  });

  it("uses the display default for each figure when it is null or absent", () => {
    const fromNull = toBaseline({
      monthlyOtherOutgoings: null,
      totalCashSavings: null,
      totalPensionPot: null,
      pensionPercent: null,
      pensionEmployerPercent: null,
    });
    const fromAbsent = toBaseline({});
    for (const baseline of [fromNull, fromAbsent]) {
      // Defaults: 5,000 cash, 15,000 pension pot, 5% and 3% pension. Other outgoings are never
      // read from the profile (item 4), so there is no stand-in for them either.
      expect(baseline.monthlyOtherOutgoings).toBeUndefined();
      expect(baseline.totalCashSavings).toBe(5000);
      expect(baseline.totalPensionPot).toBe(15000);
      expect(baseline.pensionContributionPct).toBe(5);
      expect(baseline.employerPensionMatchPct).toBe(3);
    }
  });

  it("uses a saved ownership share and 100% when none is saved", () => {
    expect(toBaseline({ propertyOwnershipShare: 50 }).propertyOwnershipSharePct).toBe(50);
    expect(toBaseline({}).propertyOwnershipSharePct).toBe(100);
  });

  it("does not assume salary sacrifice when it was never answered", () => {
    expect(toBaseline({}).isSalarySacrifice).toBe(false);
  });
});

describe("userProfileToSavedBaseline: what counts as a saved salary", () => {
  it("uses an empty user id when no id or fallback is given", () => {
    expect(userProfileToSavedBaseline({}).userId).toBe("");
  });

  it("treats a salary of 0 as not set", () => {
    const saved = userProfileToSavedBaseline({ annualSalary: 0 });
    expect(saved.annualGrossSalary).toBe(0);
    expect(saved.notSet).toContain("annualGrossSalary");
  });

  it("treats a non-finite salary as not set", () => {
    const saved = userProfileToSavedBaseline({ annualSalary: Number.POSITIVE_INFINITY });
    expect(saved.annualGrossSalary).toBe(0);
    expect(saved.notSet).toContain("annualGrossSalary");
  });

  it("treats a positive salary as saved", () => {
    const saved = userProfileToSavedBaseline({ annualSalary: 1 });
    expect(saved.annualGrossSalary).toBe(1);
    expect(saved.notSet ?? []).not.toContain("annualGrossSalary");
  });
});

describe("financialBaselineToUserProfileUpdate: field mapping", () => {
  const base: FinancialBaseline = { ...DEFAULT_FINANCIAL_BASELINE };

  it("writes each employment status as its profile spelling", () => {
    const update = (employmentStatus: FinancialBaseline["employmentStatus"]) =>
      financialBaselineToUserProfileUpdate({ ...base, employmentStatus }).employmentType;
    expect(update("PAYE")).toBe("employed");
    expect(update("SELF_EMPLOYED")).toBe("self-employed");
    expect(update("OTHER")).toBe("other");
  });

  it("writes renting and owning outright as their profile spellings", () => {
    const update = (housingStatus: FinancialBaseline["housingStatus"]) =>
      financialBaselineToUserProfileUpdate({ ...base, housingStatus }).housingStatus;
    expect(update("RENTING")).toBe("renting");
    expect(update("OWN_OUTRIGHT")).toBe("own_outright");
  });

  it("passes a saved age and take-home through", () => {
    const update = financialBaselineToUserProfileUpdate({
      ...base,
      age: 40,
      monthlyTakeHomeOverride: 2500,
    });
    expect(update.age).toBe(40);
    expect(update.monthlyTakeHome).toBe(2500);
  });

  it("marks a mortgage when there is a balance or the status is mortgage, and not otherwise", () => {
    const hasMortgage = (
      mortgageBalance: number,
      housingStatus: FinancialBaseline["housingStatus"],
    ) =>
      financialBaselineToUserProfileUpdate({ ...base, mortgageBalance, housingStatus }).hasMortgage;
    expect(hasMortgage(0, "RENTING")).toBe(false);
    expect(hasMortgage(100000, undefined)).toBe(true);
    expect(hasMortgage(0, "MORTGAGE")).toBe(true);
  });
});

describe("hydrateBaselineFromSeed: seed values and stand-ins", () => {
  it("uses an empty user id when none is given", () => {
    expect(hydrateBaselineFromSeed({}).userId).toBe("");
  });

  it("uses a 65,000 stand-in salary for the wealth mode and 38,000 otherwise", () => {
    expect(hydrateBaselineFromSeed({ mode: "WEALTH" }).annualGrossSalary).toBe(65000);
    expect(hydrateBaselineFromSeed({}).annualGrossSalary).toBe(38000);
  });

  it("passes each seeded figure through in place of its stand-in", () => {
    const baseline = hydrateBaselineFromSeed({
      pensionContributionPct: 8,
      totalCashSavings: 2000,
      mortgageBalance: 150000,
      propertyValue: 250000,
      monthlyHousingCost: 1200,
      monthlyOtherOutgoings: 800,
      totalPensionPot: 30000,
      age: 45,
    });
    expect(baseline.pensionContributionPct).toBe(8);
    expect(baseline.totalCashSavings).toBe(2000);
    expect(baseline.mortgageBalance).toBe(150000);
    expect(baseline.propertyValue).toBe(250000);
    expect(baseline.monthlyHousingCost).toBe(1200);
    expect(baseline.monthlyOtherOutgoings).toBe(800);
    expect(baseline.totalPensionPot).toBe(30000);
    expect(baseline.age).toBe(45);
  });

  it("reads salary sacrifice from either field and defaults it to false", () => {
    expect(hydrateBaselineFromSeed({ isSalarySacrifice: true }).isSalarySacrifice).toBe(true);
    expect(hydrateBaselineFromSeed({ salarySacrifice: true }).isSalarySacrifice).toBe(true);
    expect(hydrateBaselineFromSeed({}).isSalarySacrifice).toBe(false);
  });

  it("reads absent debt as 0", () => {
    expect(hydrateBaselineFromSeed({}).totalUnsecuredDebt).toBe(0);
  });

  it("keeps an explicitly inferred stage even when there is debt", () => {
    const baseline = hydrateBaselineFromSeed({
      inferredStage: "STAGE_3_WEALTH_OPTIMIZE",
      totalUnsecuredDebt: 500,
    });
    expect(baseline.financialStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
  });

  it("infers the debt stage from the debt mode alone or from debt alone", () => {
    expect(hydrateBaselineFromSeed({ mode: "DEBT", totalUnsecuredDebt: 0 }).financialStage).toBe(
      "STAGE_1_DEBT_RECOVERY",
    );
    expect(hydrateBaselineFromSeed({ totalUnsecuredDebt: 500 }).financialStage).toBe(
      "STAGE_1_DEBT_RECOVERY",
    );
  });

  it("infers the wealth stage from a salary of exactly 100,000 and the buffer stage below it", () => {
    expect(hydrateBaselineFromSeed({ annualGrossSalary: 100000 }).financialStage).toBe(
      "STAGE_3_WEALTH_OPTIMIZE",
    );
    expect(hydrateBaselineFromSeed({ annualGrossSalary: 50000 }).financialStage).toBe(
      "STAGE_2_BUFFER_BUILD",
    );
  });

  it("keeps known inferred modules, maps savings to accounts and drops unknown ones", () => {
    expect(
      hydrateBaselineFromSeed({ inferredModules: ["accounts", "mortgage", "bogus"] })
        .enabledModules,
    ).toEqual(["accounts", "mortgage"]);
    expect(hydrateBaselineFromSeed({ inferredModules: ["savings"] }).enabledModules).toEqual([
      "accounts",
    ]);
  });
});

describe("hydrateBaselineFromSeed: modules inferred when the seed lists none", () => {
  // A seed with no pension pot, contribution, debt or mortgage, PAYE: only the core three.
  const quiet = { totalPensionPot: 0, pensionContributionPct: 0, annualGrossSalary: 30000 };

  it("starts from accounts, budget and forecast", () => {
    expect(hydrateBaselineFromSeed(quiet).enabledModules).toEqual([
      "accounts",
      "budget",
      "forecast",
    ]);
  });

  it("adds debt for unsecured debt, for the debt stage, and for debt under another stage", () => {
    expect(hydrateBaselineFromSeed({ ...quiet, totalUnsecuredDebt: 500 }).enabledModules).toContain(
      "debt",
    );
    expect(
      hydrateBaselineFromSeed({ ...quiet, mode: "DEBT", totalUnsecuredDebt: 0 }).enabledModules,
    ).toContain("debt");
    expect(
      hydrateBaselineFromSeed({
        ...quiet,
        inferredStage: "STAGE_2_BUFFER_BUILD",
        totalUnsecuredDebt: 500,
      }).enabledModules,
    ).toContain("debt");
  });

  it("adds pension for a pension pot or a contribution", () => {
    expect(hydrateBaselineFromSeed({ ...quiet, totalPensionPot: 1000 }).enabledModules).toContain(
      "pension",
    );
    expect(
      hydrateBaselineFromSeed({ ...quiet, pensionContributionPct: 5 }).enabledModules,
    ).toContain("pension");
  });

  it("adds mortgage for a mortgage status or a mortgage balance under another status", () => {
    expect(
      hydrateBaselineFromSeed({ ...quiet, housingStatus: "mortgage", mortgageBalance: 0 })
        .enabledModules,
    ).toContain("mortgage");
    expect(
      hydrateBaselineFromSeed({ ...quiet, housingStatus: "renting", mortgageBalance: 100000 })
        .enabledModules,
    ).toContain("mortgage");
    expect(
      hydrateBaselineFromSeed({ ...quiet, housingStatus: "renting", mortgageBalance: 0 })
        .enabledModules,
    ).not.toContain("mortgage");
  });

  it("adds Self Assessment only for self-employed people", () => {
    expect(
      hydrateBaselineFromSeed({ ...quiet, employmentStatus: "self-employed" }).enabledModules,
    ).toContain("tax");
    expect(hydrateBaselineFromSeed(quiet).enabledModules).not.toContain("tax");
  });

  it("lists the modules in a fixed order: core, debt, pension, mortgage, tax", () => {
    const baseline = hydrateBaselineFromSeed({
      totalUnsecuredDebt: 500,
      totalPensionPot: 1000,
      housingStatus: "mortgage",
      employmentStatus: "self-employed",
    });
    expect(baseline.enabledModules).toEqual([
      "accounts",
      "budget",
      "forecast",
      "debt",
      "pension",
      "mortgage",
      "tax",
    ]);
  });
});

describe("seed codec: exact encodings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // {"a":1} is the bytes 7B 22 61 22 3A 31 7D. In 6-bit groups:
  // 7B 22 61 -> 30 50 9 33 -> "eyJh"; 22 3A 31 -> 8 35 40 49 -> "Ijox"; 7D -> 31 16 -> "fQ==".
  // URL-safe form drops the two "=" pads: "eyJhIjoxfQ".
  const A1 = "eyJhIjoxfQ";

  it("encodes to URL-safe Base64 with every pad removed", () => {
    expect(encodeSeedPayload({ a: 1 })).toBe(A1);
  });

  it("encodes the same way where Buffer is missing (browsers)", () => {
    vi.stubGlobal("Buffer", undefined);
    expect(encodeSeedPayload({ a: 1 })).toBe(A1);
  });

  it("decodes where Buffer is missing (browsers)", () => {
    vi.stubGlobal("Buffer", undefined);
    expect(decodeSeedPayload(A1)).toEqual({ a: 1 });
  });

  it("round-trips non-ASCII text where Buffer is missing", () => {
    vi.stubGlobal("Buffer", undefined);
    const payload = { note: "Zoë £5" };
    expect(decodeSeedPayload(encodeSeedPayload(payload))).toEqual(payload);
  });

  it("round-trips a payload whose Base64 holds both + and /", () => {
    // Base64 of {"note":"£££~~~>>>???"} contains "+" and "/", so the URL-safe form has "-" and "_".
    const payload = { note: "£££~~~>>>???" };
    const encoded = encodeSeedPayload(payload);
    expect(encoded).toContain("-");
    expect(encoded).toContain("_");
    expect(encoded).not.toMatch(/[+/=]/);
    expect(decodeSeedPayload(encoded)).toEqual(payload);
  });

  // "{}" is 7B 7D; each XOR 0x5F gives 24 22; in 6-bit groups 9 2 8 -> "JCI=".
  it("scrambles a legacy seed by XOR 0x5F then Base64", () => {
    expect(scrambleSeedLegacy("{}")).toBe("JCI=");
  });

  it("scrambles and unscrambles the same way where Buffer is missing", () => {
    vi.stubGlobal("Buffer", undefined);
    expect(scrambleSeedLegacy("{}")).toBe("JCI=");
    expect(unscrambleSeedLegacy("JCI=")).toBe("{}");
  });

  it("returns non-Base64 input unchanged from the legacy unscramble", () => {
    expect(unscrambleSeedLegacy("!!!")).toBe("!!!");
  });

  it("decodes an unpadded legacy seed whose length leaves one pad missing", () => {
    // "JCI" is 3 characters, so one "=" restores "JCI=", which unscrambles to "{}".
    expect(decodeSeedPayload("JCI")).toEqual({});
  });
});

describe("seed codec: what is and is not a seed", () => {
  it("trims whitespace around raw JSON", () => {
    expect(decodeSeedPayload('  {"a":1}  ')).toEqual({ a: 1 });
  });

  it("keeps percent text in raw JSON as written", () => {
    // Not URL-encoded (no leading %7B, no %22), so "%41" is text, not an encoded "A".
    expect(decodeSeedPayload('{"note":"%41"}')).toEqual({ note: "%41" });
  });

  it("decodes URL-encoded JSON in lower-case hex", () => {
    expect(decodeSeedPayload("%7b%22a%22%3a1%7d")).toEqual({ a: 1 });
  });

  it("decodes URL-encoded JSON that starts with %7B but has no encoded quotes", () => {
    expect(decodeSeedPayload('%7B"a":1%7D')).toEqual({ a: 1 });
  });

  it("rejects valid JSON that is not an object", () => {
    // "123" as raw text.
    expect(decodeSeedPayload("123")).toBeNull();
    // "MTIz" is Base64 of "123": 31 32 33 -> 12 19 8 51 -> M T I z.
    expect(decodeSeedPayload("MTIz")).toBeNull();
    // "bm1s" is Base64 of "nml" (6E 6D 6C), which XOR 0x5F is "123", a legacy non-object.
    expect(decodeSeedPayload("bm1s")).toBeNull();
  });
});

describe("InMemoryProfileAdapter initial values", () => {
  it("starts with the baseline and seed it is given", () => {
    const baseline: FinancialBaseline = { ...DEFAULT_FINANCIAL_BASELINE, userId: "u1" };
    const seed = { mode: "DEBT" } as unknown as OnboardingSeedPayload;
    const adapter = new InMemoryProfileAdapter(baseline, seed);
    expect(adapter.getBaseline()).toEqual(baseline);
    expect(adapter.getSeed()).toEqual(seed);
  });
});

describe("userProfileToFinancialBaseline: a null value is not a saved 0", () => {
  it("uses the saved age when the birth year is null", () => {
    // Birth year null means not set, so the saved age of 40 applies.
    expect(toBaseline({ birthYear: null, age: 40 }).age).toBe(40);
  });

  it("presumes the 900 housing cost for renting when the cost is null", () => {
    // Null means never saved; renting with no saved cost takes the 900 display default.
    expect(
      toBaseline({ housingStatus: "renting", monthlyHousingCost: null }).monthlyHousingCost,
    ).toBe(900);
  });
});
