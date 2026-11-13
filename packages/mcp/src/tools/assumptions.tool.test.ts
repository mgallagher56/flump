import { afterEach, describe, expect, it, vi } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser, mortgageAndIsa } from "../testing/personas.js";

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
});
