import { afterEach, describe, expect, it, vi } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { emptyUser, mortgageAndIsa } from "../testing/personas.js";

interface A {
  field: string;
  value?: number | string;
  source: string;
  reason: string;
}

type Env = { taxYear: string; assumptions: A[]; verification: { status: string; detail: string } };

const TAX_YEAR_TOOLS = ["get_tax_year_position", "list_tax_records"] as const;

describe("tax-year defaults and verification (E17-N5, re-plan PR A)", () => {
  let h: TestHarness | undefined;
  afterEach(async () => {
    vi.useRealTimers();
    await h?.close();
    h = undefined;
  });

  it("get_tax_year_position returns verification and the standard notice", async () => {
    h = await connectTestClient(mortgageAndIsa);
    const e = (await h.callJson("get_tax_year_position", { taxYear: "2025/26" })) as Env & {
      notice: string;
    };
    expect(["verified", "unverified"]).toContain(e.verification.status);
    expect(e.verification.detail.length).toBeGreaterThan(0);
    expect(e.notice).toMatch(/Guidance, not advice/);
  });

  it("an unsupported year is rejected by the schema enum", async () => {
    h = await connectTestClient(mortgageAndIsa);
    for (const name of TAX_YEAR_TOOLS) {
      const res = await h.client.callTool({ name, arguments: { taxYear: "2019/20" } });
      expect(res.isError, name).toBe(true);
    }
  });

  it("the default tax year rolls over on 6 April", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    h = await connectTestClient(emptyUser);
    for (const name of TAX_YEAR_TOOLS) {
      vi.setSystemTime(new Date("2026-04-05T12:00:00Z"));
      const before = (await h.callJson(name, {})) as Env;
      vi.setSystemTime(new Date("2026-04-06T12:00:00Z"));
      const after = (await h.callJson(name, {})) as Env;
      expect(before.taxYear, name).toBe("2025/26");
      expect(after.taxYear, name).toBe("2026/27");
    }
  });

  it("rolls over at UK midnight: 2026-04-05T23:30Z is 6 April in BST", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    h = await connectTestClient(emptyUser);
    vi.setSystemTime(new Date("2026-04-05T23:30:00Z"));
    expect(((await h.callJson("get_tax_year_position", {})) as Env).taxYear).toBe("2026/27");
  });

  it("schemas take their year enum from SUPPORTED_UK_TAX_YEARS", async () => {
    h = await connectTestClient(emptyUser);
    const { tools } = await h.client.listTools();
    for (const name of TAX_YEAR_TOOLS) {
      const schema = tools.find((t) => t.name === name)?.inputSchema as {
        properties: { taxYear: { enum: string[] } };
      };
      expect(schema.properties.taxYear.enum).toContain("2020/21");
      expect(schema.properties.taxYear.enum).toContain("2026/27");
    }
  });

  it("every year that is not signed off is reported unverified", async () => {
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
      const e = (await h.callJson("get_tax_year_position", { taxYear: year })) as Env;
      // No vector is signed off yet (the owner is the only signer), so no year may read verified.
      expect(e.verification.status, year).toBe("unverified");
    }
  });

  it("falls back to the latest supported year, with an assumption, from 6 April 2027", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    h = await connectTestClient(mortgageAndIsa);
    vi.setSystemTime(new Date("2027-04-06T12:00:00Z"));
    for (const name of TAX_YEAR_TOOLS) {
      const e = (await h.callJson(name, {})) as Env;
      expect(e.taxYear, name).toBe("2026/27");
      expect(
        e.assumptions.map((a) => a.field),
        name,
      ).toContain("taxYear");
    }
  });

  it("the legacy tax tools, prompts and context resources are gone", async () => {
    h = await connectTestClient(emptyUser);
    const names = (await h.client.listTools()).tools.map((t) => t.name);
    for (const gone of [
      "simulate_uk_tax_and_pension_sacrifice",
      "calculate_self_assessment_and_section24",
      "evaluate_student_loan_overpayment",
      "get_net_worth_history",
    ]) {
      expect(names).not.toContain(gone);
    }
    const uris = (await h.client.listResources()).resources.map((r) => r.uri);
    expect(uris).toEqual(["flump://schema"]);
    expect(h.client.getServerCapabilities()?.prompts).toBeUndefined();
  });
});
