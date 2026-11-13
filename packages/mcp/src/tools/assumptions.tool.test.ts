import { afterEach, describe, expect, it, vi } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser, mortgageAndIsa, renterWithUnknownAprCard } from "../testing/personas.js";

interface A {
  field: string;
  value: number | string;
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
});
