import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestClient, type TestHarness } from "../testing/client.js";
import { renterWithUnknownAprCard } from "../testing/personas.js";

/** Minimal valid arguments per tool. Every registered tool must have an entry. */
const TOOL_ARGS: Record<string, Record<string, unknown>> = {
  simulate_uk_tax_and_pension_sacrifice: { employeePensionPct: 5 },
  calculate_self_assessment_and_section24: { taxYear: "2025/26" },
  compare_mortgage_overpay_vs_invest: { monthlyAmountGbp: 300, expectedReturnPct: 5 },
  simulate_debt_payoff: {},
  project_net_worth: { expectedReturnPct: 5 },
  evaluate_student_loan_overpayment: { plan: "plan5", balanceGbp: 30000, annualSalaryGbp: 40000 },
  get_financial_snapshot: {},
  get_net_worth_history: {},
  list_accounts: {},
  get_budget_summary: {},
  get_debt_overview: {},
};

/** E17-N3: summaries only, compact JSON, SDK registration, real version. */
describe("MCP output size and registration (E17-N3)", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(renterWithUnknownAprCard);
  });
  afterAll(async () => {
    await h.close();
  });

  it("compare returns one summary per strategy and no per-debt schedule", async () => {
    const text = await h.callText("simulate_debt_payoff", {
      strategy: "compare",
      debts: [],
    });
    expect(text).not.toContain("monthlySchedule");
    expect(text).not.toContain('"payments":[');
  });

  it("executive-snapshot drops monthlySchedule and is compact", async () => {
    const res = await h.client.readResource({ uri: "flump://context/executive-snapshot" });
    const text = (res.contents[0] as { text: string }).text;
    expect(text).not.toContain("monthlySchedule");
    expect(JSON.parse(text).debtSummary.avalancheVsSnowballComparison.avalanche.months).toBeTypeOf(
      "number",
    );
    expect(text).not.toContain("\n");
  });

  it("every resource and tool output is compact JSON", async () => {
    const { resources } = await h.client.listResources();
    for (const r of resources) {
      const res = await h.client.readResource({ uri: r.uri });
      expect((res.contents[0] as { text: string }).text, r.uri).not.toContain("\n");
    }
    const { tools } = await h.client.listTools();
    for (const tool of tools) {
      const args = TOOL_ARGS[tool.name];
      expect(args, `no minimal args for tool ${tool.name}; add it to TOOL_ARGS`).toBeDefined();
      expect(await h.callText(tool.name, args), tool.name).not.toContain("\n");
    }
  });

  it("registers exactly the expected resources", async () => {
    const { resources } = await h.client.listResources();
    expect(resources.map((r) => [r.name, r.uri]).sort()).toEqual(
      [
        ["accounts", "flump://context/accounts"],
        ["baseline", "flump://context/baseline"],
        ["budget", "flump://context/budget"],
        ["executive-snapshot", "flump://context/executive-snapshot"],
        ["tax-ledger", "flump://context/tax-ledger"],
      ].sort(),
    );
  });

  it("gives tools distinct titles", async () => {
    const { tools } = await h.client.listTools();
    const titles = tools.map((t) => t.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("gives every tool, resource and prompt a title", async () => {
    const { tools } = await h.client.listTools();
    const { resources } = await h.client.listResources();
    const { prompts } = await h.client.listPrompts();
    for (const item of [...tools, ...resources, ...prompts]) {
      expect(item.title, item.name).toBeTruthy();
    }
  });

  it("reports the package.json version as the server version", () => {
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    expect(h.client.getServerVersion()?.version).toBe(pkg.version);
  });
});
