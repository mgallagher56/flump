import { afterEach, describe, expect, it, vi } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser, mortgageAndIsa, renterWithUnknownAprCard } from "../testing/personas.js";

interface A {
  field: string;
  value?: number | string;
  reason: string;
}

describe("interim assumptions, tax-year defaults and verification (E17-N5)", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    vi.useRealTimers();
    await h?.close();
    h = undefined;
  });

  const assumptionFields = (body: unknown) =>
    ((body as { assumptions: A[] }).assumptions ?? []).map((a) => a.field);

  it("mortgage tool lists every default it used", async () => {
    h = await connectTestClient(emptyUser);
    const body = await h.callJson("compare_mortgage_overpay_vs_isa", {});
    expect(assumptionFields(body)).toEqual(
      expect.arrayContaining([
        "propertyValueGbp",
        "mortgageBalanceGbp",
        "mortgageRateApr",
        "remainingTermMonths",
      ]),
    );
  });

  it("mortgage tool lists no assumptions when everything is supplied", async () => {
    h = await connectTestClient(emptyUser);
    const body = await h.callJson("compare_mortgage_overpay_vs_isa", {
      hypotheticalPropertyValueGbp: 300000,
      hypotheticalMortgageBalanceGbp: 200000,
      hypotheticalMortgageRateApr: 5,
      remainingTermMonths: 300,
    });
    expect((body as { assumptions: A[] }).assumptions).toEqual([]);
  });

  it("cash-flow tool lists income, essentials and savings defaults", async () => {
    h = await connectTestClient(emptyUser);
    const body = await h.callJson("evaluate_cashflow_runway_and_health", {});
    expect(assumptionFields(body)).toEqual(
      expect.arrayContaining([
        "monthlyIncomeGbp",
        "monthlyHousingCostGbp",
        "liquidEmergencyFundGbp",
      ]),
    );
  });

  it("debt tool lists the assumed APR and minimum payment for a card with no APR", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const body = await h.callJson("simulate_debt_payoff", { strategy: "AVALANCHE" });
    const fields = assumptionFields(body);
    expect(fields).toContain("Credit Card Account #1 interestRateApr");
    expect(fields).toContain("Credit Card Account #1 minimumPaymentGbp");
  });

  it("debt tool COMPARE_BOTH also lists assumptions", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const body = await h.callJson("simulate_debt_payoff", { strategy: "COMPARE_BOTH" });
    expect(assumptionFields(body)).toContain("Credit Card Account #1 interestRateApr");
  });

  it("life-events tool lists cash, pension and age defaults", async () => {
    h = await connectTestClient(emptyUser);
    const body = await h.callJson("project_wealth_scenario", {});
    expect(assumptionFields(body)).toEqual(
      expect.arrayContaining(["totalCashSavingsGbp", "totalPensionPotGbp", "age"]),
    );
  });

  it("student loan plan is required", async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
    const res = await h.client.callTool({
      name: "evaluate_uk_student_loan",
      arguments: { currentBalanceGbp: 40000 },
    });
    expect(res.isError).toBe(true);
  });

  it("tax tools return verification and a notice", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const trap = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 5,
    })) as { verification: { status: string; detail: string }; notice: string };
    expect(["verified", "unverified"]).toContain(trap.verification.status);
    expect(trap.verification.detail.length).toBeGreaterThan(0);
    expect(trap.notice).toMatch(/not tax advice/i);
    const s24 = (await h.callJson("calculate_self_assessment_and_section24", {
      taxYear: "2025/26",
    })) as { verification: { status: string }; notice: string };
    expect(s24.verification.status).toBeDefined();
    expect(s24.notice).toMatch(/not tax advice/i);
  });

  it("an unsupported year is rejected by the schema enum", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const res = await h.client.callTool({
      name: "calculate_self_assessment_and_section24",
      arguments: { taxYear: "2019/20" },
    });
    expect(res.isError).toBe(true);
  });

  it("the default tax year rolls over on 6 April", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    h = await connectTestClient(emptyUser);
    vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
    const before = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 5,
      hypotheticalGrossSalaryGbp: 40000,
      region: "ENGLAND_NI_WALES",
    })) as { taxYear: string };
    vi.setSystemTime(new Date("2026-04-06T12:00:00Z"));
    const after = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 5,
      hypotheticalGrossSalaryGbp: 40000,
      region: "ENGLAND_NI_WALES",
    })) as { taxYear: string };
    expect(before.taxYear).toBe("2025/26");
    expect(after.taxYear).toBe("2026/27");
  });

  it("schemas take their year enum from SUPPORTED_UK_TAX_YEARS", async () => {
    h = await connectTestClient(emptyUser);
    const { tools } = await h.client.listTools();
    for (const name of [
      "simulate_uk_tax_and_pension_sacrifice",
      "calculate_self_assessment_and_section24",
    ]) {
      const schema = tools.find((t) => t.name === name)?.inputSchema as {
        properties: { taxYear: { enum: string[] } };
      };
      expect(schema.properties.taxYear.enum).toContain("2020/21");
      expect(schema.properties.taxYear.enum).toContain("2026/27");
    }
  });

  it("the uk-fiscal-guardrails resource is gone", async () => {
    h = await connectTestClient(emptyUser);
    const { resources } = await h.client.listResources();
    expect(resources.map((r) => r.uri)).not.toContain("flump://rules/uk-fiscal-guardrails");
  });

  it("every year that is not signed off is reported unverified by both tax tools", async () => {
    h = await connectTestClient(mortgageAndIsa);
    for (const year of [
      "2020/21",
      "2021/22",
      "2022/23",
      "2023/24",
      "2024/25",
      "2025/26",
      "2026/27",
    ]) {
      const trap = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
        employeePensionPct: 5,
        taxYear: year,
      })) as { verification: { status: string } };
      const s24 = (await h.callJson("calculate_self_assessment_and_section24", {
        taxYear: year,
      })) as { verification: { status: string } };
      // No vector is signed off yet (the owner is the only signer), so no year may read verified.
      expect(trap.verification.status, year).toBe("unverified");
      expect(s24.verification.status, year).toBe("unverified");
    }
  });

  it("rolls over at UK midnight: 2026-04-05T23:30Z is 6 April in BST", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    h = await connectTestClient(emptyUser);
    vi.setSystemTime(new Date("2026-04-05T23:30:00Z"));
    const body = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 5,
      hypotheticalGrossSalaryGbp: 40000,
    })) as { taxYear: string };
    expect(body.taxYear).toBe("2026/27");
  });

  it("falls back to the latest supported year, with an assumption, from 6 April 2027", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    h = await connectTestClient(mortgageAndIsa);
    vi.setSystemTime(new Date("2027-04-06T12:00:00Z"));
    const trap = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 5,
    })) as { taxYear: string; assumptions: A[] };
    expect(trap.taxYear).toBe("2026/27");
    expect(trap.assumptions.map((a) => a.field)).toContain("taxYear");
    const s24 = (await h.callJson("calculate_self_assessment_and_section24", {})) as {
      taxYear: string;
      assumptions: A[];
    };
    expect(s24.taxYear).toBe("2026/27");
    expect(s24.assumptions.map((a) => a.field)).toContain("taxYear");
  });

  describe("assumptions never echo user-derived numbers", () => {
    const rich = {
      ...renterWithUnknownAprCard,
      baseline: {
        ...renterWithUnknownAprCard.baseline,
        annualGrossSalary: 53123,
        totalCashSavings: 12345,
        totalPensionPot: 41234,
        age: 37,
      },
      accounts: [
        { id: "cc_9", name: "Secret Bank Card", type: "Credit Card", balance: 3777 },
        { id: "cur_9", name: "Secret Current", type: "Current", balance: 1200 },
      ],
    };

    // Constants the tools may substitute, plus labels. Anything else numeric would be user-derived.
    const CONSTANTS = new Set([900, 1100, 5000, 15000, 19.9, 39.9, 32, 350000, 220000, 4.5, 240]);

    it("only substituted constants appear as values, across all tools", async () => {
      h = await connectTestClient(rich);
      const calls: Array<[string, Record<string, unknown>]> = [
        ["evaluate_cashflow_runway_and_health", {}],
        ["simulate_debt_payoff", { strategy: "AVALANCHE" }],
        ["simulate_debt_payoff", { strategy: "COMPARE_BOTH" }],
        ["project_wealth_scenario", {}],
        ["compare_mortgage_overpay_vs_isa", {}],
      ];
      for (const [name, args] of calls) {
        const body = (await h.callJson(name, args)) as { assumptions: A[] };
        for (const a of body.assumptions) {
          if (a.value !== undefined && typeof a.value === "number") {
            expect(CONSTANTS.has(a.value), `${name}: ${a.field}=${a.value}`).toBe(true);
          }
        }
        const text = JSON.stringify(body.assumptions);
        for (const n of ["53123", "12345", "41234", "3777", "3.8e3"]) {
          expect(text).not.toContain(n);
        }
      }
    });

    it("derived assumptions carry no value", async () => {
      h = await connectTestClient(rich);
      const audit = (await h.callJson("evaluate_cashflow_runway_and_health", {})) as {
        assumptions: A[];
      };
      const income = audit.assumptions.find((a) => a.field === "monthlyIncomeGbp");
      expect(income).toBeDefined();
      expect(income && "value" in income).toBe(false);
      const wealth = (await h.callJson("project_wealth_scenario", {})) as { assumptions: A[] };
      const isa = wealth.assumptions.find((a) => a.field === "initialIsaGbp");
      expect(isa).toBeDefined();
      expect(isa && "value" in isa).toBe(false);
    });

    it("cash-flow assumptions use generic labels when the token is anonymised", async () => {
      h = await connectTestClient(rich);
      const audit = await h.callText("evaluate_cashflow_runway_and_health", {});
      expect(audit).not.toContain("Secret Bank Card");
      expect(audit).toContain("Credit Card Account #1");
    });

    it("cash-flow assumptions keep real names for a non-anonymised token", async () => {
      const { TEST_TOKEN } = await import("../testing/client.js");
      h = await connectTestClient(rich, { token: { ...TEST_TOKEN, anonymizeInstitutions: false } });
      const audit = await h.callText("evaluate_cashflow_runway_and_health", {});
      expect(audit).toContain("Secret Bank Card");
    });
  });
});
