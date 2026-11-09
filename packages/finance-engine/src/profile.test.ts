import { describe, expect, it } from "vitest";
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
} from "./profile.js";
import type { FinancialBaseline, OnboardingSeedPayload } from "./types.js";

describe("profile domain module", () => {
  describe("normalization helpers", () => {
    it("normalizes student loan plan variants", () => {
      expect(normalizeStudentLoanPlan("plan1")).toBe("PLAN_1");
      expect(normalizeStudentLoanPlan("PLAN_2")).toBe("PLAN_2");
      expect(normalizeStudentLoanPlan("plan 4")).toBe("PLAN_4");
      expect(normalizeStudentLoanPlan("plan5")).toBe("PLAN_5");
      expect(normalizeStudentLoanPlan("postgrad")).toBe("POSTGRAD");
      expect(normalizeStudentLoanPlan("unknown")).toBe("NONE");
      expect(normalizeStudentLoanPlan(null)).toBe("NONE");
    });

    it("normalizes employment status", () => {
      expect(normalizeEmploymentStatus("employed")).toBe("PAYE");
      expect(normalizeEmploymentStatus("self-employed")).toBe("SELF_EMPLOYED");
      expect(normalizeEmploymentStatus("paye", false)).toBe("PAYE");
      expect(normalizeEmploymentStatus(undefined, true)).toBe("SELF_EMPLOYED");
      expect(normalizeEmploymentStatus("other")).toBe("OTHER");
    });

    it("normalizes housing status", () => {
      expect(normalizeHousingStatus("mortgage")).toBe("MORTGAGE");
      expect(normalizeHousingStatus("own_outright")).toBe("OWN_OUTRIGHT");
      expect(normalizeHousingStatus("renting")).toBe("RENTING");
      expect(normalizeHousingStatus(undefined, 200000)).toBe("MORTGAGE");
      expect(normalizeHousingStatus(undefined, 0)).toBe("RENTING");
    });
  });

  describe("userProfileToFinancialBaseline", () => {
    it("maps user profile fields to baseline with STAGE_2_BUFFER_BUILD default", () => {
      const baseline = userProfileToFinancialBaseline({
        userId: "user_123",
        annualSalary: 55000,
        age: 35,
        employmentType: "employed",
        housingStatus: "mortgage",
        mortgageBalance: 180000,
        monthlyHousingCost: 950,
        totalCashSavings: 12000,
        totalPensionPot: 30000,
        pensionPercent: 6,
        pensionEmployerPercent: 4,
        isSalarySacrifice: true,
        studentLoanPlan: "plan2",
      });

      expect(baseline.userId).toBe("user_123");
      expect(baseline.annualGrossSalary).toBe(55000);
      expect(baseline.age).toBe(35);
      expect(baseline.employmentStatus).toBe("PAYE");
      expect(baseline.housingStatus).toBe("MORTGAGE");
      expect(baseline.mortgageBalance).toBe(180000);
      expect(baseline.monthlyHousingCost).toBe(950);
      expect(baseline.studentLoanPlan).toBe("PLAN_2");
      expect(baseline.financialStage).toBe("STAGE_2_BUFFER_BUILD");
    });

    it("assigns STAGE_1_DEBT_RECOVERY when totalUnsecuredDebt > 0", () => {
      const baseline = userProfileToFinancialBaseline({
        annualSalary: 40000,
        totalUnsecuredDebt: 4500,
      });
      expect(baseline.financialStage).toBe("STAGE_1_DEBT_RECOVERY");
    });

    it("assigns STAGE_3_WEALTH_OPTIMIZE when annualSalary >= 100k and no unsecured debt", () => {
      const baseline = userProfileToFinancialBaseline({
        annualSalary: 125000,
        totalUnsecuredDebt: 0,
      });
      expect(baseline.financialStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
    });

    it("normalizes 'savings' module in enabledPages to 'accounts'", () => {
      const baseline = userProfileToFinancialBaseline({
        enabledPages: ["budget", "savings", "tax"],
      });
      expect(baseline.enabledModules).toContain("accounts");
      expect(baseline.enabledModules).toContain("budget");
      expect(baseline.enabledModules).toContain("tax");
      expect(baseline.enabledModules).not.toContain("savings" as any);
    });
  });

  describe("financialBaselineToUserProfileUpdate", () => {
    it("converts baseline back to user profile updates", () => {
      const baseline: FinancialBaseline = {
        ...DEFAULT_FINANCIAL_BASELINE,
        userId: "u1",
        annualGrossSalary: 72000,
        employmentStatus: "SELF_EMPLOYED",
        housingStatus: "MORTGAGE",
        mortgageBalance: 240000,
        totalCashSavings: 15000,
        pensionContributionPct: 7,
      };

      const update = financialBaselineToUserProfileUpdate(baseline);
      expect(update.annualSalary).toBe(72000);
      expect(update.employmentType).toBe("self-employed");
      expect(update.housingStatus).toBe("mortgage");
      expect(update.mortgageBalance).toBe(240000);
      expect(update.hasMortgage).toBe(true);
      expect(update.totalCashSavings).toBe(15000);
      expect(update.pensionPercent).toBe(7);
    });
  });

  describe("hydrateBaselineFromSeed", () => {
    it("hydrates debt recovery seed accurately", () => {
      const seed: OnboardingSeedPayload = {
        mode: "DEBT",
        annualIncome: 34000,
        totalUnsecuredDebt: 6500,
        inferredModules: ["debt", "budget"],
        timestamp: Date.now(),
      };

      const baseline = hydrateBaselineFromSeed(seed, "debt_user");
      expect(baseline.userId).toBe("debt_user");
      expect(baseline.annualGrossSalary).toBe(34000);
      expect(baseline.totalUnsecuredDebt).toBe(6500);
      expect(baseline.financialStage).toBe("STAGE_1_DEBT_RECOVERY");
      expect(baseline.enabledModules).toEqual(["debt", "budget"]);
    });

    it("hydrates wealth optimize seed accurately", () => {
      const seed: OnboardingSeedPayload = {
        mode: "WEALTH",
        annualGrossSalary: 110000,
        inferredModules: ["forecast", "pension", "tax"],
        timestamp: Date.now(),
      };

      const baseline = hydrateBaselineFromSeed(seed, "wealth_user");
      expect(baseline.annualGrossSalary).toBe(110000);
      expect(baseline.financialStage).toBe("STAGE_3_WEALTH_OPTIMIZE");
      expect(baseline.enabledModules).toEqual(["forecast", "pension", "tax"]);
    });
  });

  describe("seed payload codec", () => {
    const payload: OnboardingSeedPayload = {
      mode: "WEALTH",
      annualGrossSalary: 85000,
      totalCashSavings: 20000,
      inferredModules: ["budget", "forecast"],
      timestamp: 1710000000000,
    };

    it("encodes and decodes URL-safe base64 correctly", () => {
      const encoded = encodeSeedPayload(payload);
      expect(typeof encoded).toBe("string");
      expect(encoded).not.toContain("+");
      expect(encoded).not.toContain("/");
      expect(encoded).not.toContain("=");

      const decoded = decodeSeedPayload(encoded);
      expect(decoded).toEqual(payload);
    });

    it("decodes legacy XOR-scrambled base64 payloads", () => {
      const legacyScrambled = scrambleSeedLegacy(JSON.stringify(payload));
      const decoded = decodeSeedPayload(legacyScrambled);
      expect(decoded).toEqual(payload);
    });

    it("decodes raw JSON string", () => {
      const rawJson = JSON.stringify(payload);
      const decoded = decodeSeedPayload(rawJson);
      expect(decoded).toEqual(payload);
    });

    it("decodes URL-encoded JSON string", () => {
      const urlEncoded = encodeURIComponent(JSON.stringify(payload));
      const decoded = decodeSeedPayload(urlEncoded);
      expect(decoded).toEqual(payload);
    });

    it("returns null safely on invalid or corrupt input without throwing", () => {
      expect(decodeSeedPayload("")).toBeNull();
      expect(decodeSeedPayload(null)).toBeNull();
      expect(decodeSeedPayload(undefined)).toBeNull();
      expect(decodeSeedPayload("invalid_gibberish_12345!@#$")).toBeNull();
    });
  });

  describe("InMemoryProfileAdapter", () => {
    it("stores and retrieves baseline and seed", () => {
      const adapter = new InMemoryProfileAdapter();
      expect(adapter.getBaseline()).toBeNull();
      expect(adapter.getSeed()).toBeNull();

      adapter.saveBaseline(DEFAULT_FINANCIAL_BASELINE);
      expect(adapter.getBaseline()?.annualGrossSalary).toBe(45000);

      const seed: OnboardingSeedPayload = {
        annualGrossSalary: 60000,
        inferredModules: ["accounts"],
        timestamp: 1000,
      };
      adapter.saveSeed(seed);
      expect(adapter.getSeed()?.annualGrossSalary).toBe(60000);

      adapter.clearSeed();
      expect(adapter.getSeed()).toBeNull();
    });
  });
});
