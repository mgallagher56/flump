import { getCurrentUkTaxYear } from "@flump/finance-engine";
import { afterEach, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { mortgageAndIsa } from "../testing/personas.js";

describe("simulate_uk_tax_and_pension_sacrifice (E17-N1)", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    await h?.close();
    h = undefined;
  });

  it("calculates tax from the persona salary", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const body = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 8,
    })) as Record<string, number | string>;
    expect(body.taxYear).toBe(getCurrentUkTaxYear());
    expect(body.grossIncomeGbp).toBeGreaterThan(0);
    expect(body.incomeTaxGbp).toBeGreaterThan(0);
  });

  it("a hypothetical salary overrides the persona's", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const low = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 5,
      hypotheticalGrossSalaryGbp: 20000,
    })) as Record<string, number>;
    const high = (await h.callJson("simulate_uk_tax_and_pension_sacrifice", {
      employeePensionPct: 5,
      hypotheticalGrossSalaryGbp: 110000,
    })) as Record<string, number & { isInTaxTrap: boolean }>;
    expect(high.incomeTaxGbp).toBeGreaterThan(low.incomeTaxGbp as number);
    expect((high.taxTrapStatus as unknown as { isInTaxTrap: boolean }).isInTaxTrap).toBe(true);
  });
});
