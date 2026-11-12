import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectTestClient, detectDefaultLeaks, type TestHarness } from "../testing/client.js";
import { emptyUser, mortgageAndIsa, renterWithUnknownAprCard } from "../testing/personas.js";

/**
 * Pins today's MCP surface (tools/list, resources/list, prompts/list) and each tool's
 * output size. Later tickets (N3 to N5, N8 to N14) change these deliberately and update
 * the snapshot in the same PR.
 */
describe("MCP surface snapshot (E17-N1)", () => {
  let h: TestHarness;
  beforeAll(async () => {
    h = await connectTestClient(mortgageAndIsa);
  });
  afterAll(async () => {
    await h.close();
  });

  it("pins tools/list", async () => {
    const { tools } = await h.client.listTools();
    expect(tools.map((t) => t.name).sort()).toMatchSnapshot("tool names");
    expect(tools).toMatchSnapshot("tools/list");
  });

  it("pins resources/list", async () => {
    const { resources } = await h.client.listResources();
    expect(resources).toMatchSnapshot();
  });

  it("pins prompts/list", async () => {
    const { prompts } = await h.client.listPrompts();
    expect(prompts).toMatchSnapshot();
  });
});

/** Minimal valid arguments per tool, so each can be called through the SDK client. */
const TOOL_CALLS: Record<string, Record<string, unknown>> = {
  simulate_debt_payoff: { strategy: "COMPARE_BOTH" },
  simulate_uk_tax_and_pension_sacrifice: { employeePensionPct: 5 },
  compare_mortgage_overpay_vs_isa: {},
  calculate_self_assessment_and_section24: { taxYear: "2025/26" },
  project_wealth_scenario: {},
  evaluate_cashflow_runway_and_health: {},
  evaluate_uk_student_loan: { currentBalanceGbp: 30000 },
  query_transactions_and_spending: {},
};

describe("per-tool output size (E17-N1)", () => {
  it("calls every registered tool and pins the output size in bytes", async () => {
    const h = await connectTestClient(renterWithUnknownAprCard);
    try {
      const { tools } = await h.client.listTools();
      expect(Object.keys(TOOL_CALLS).sort()).toEqual(tools.map((t) => t.name).sort());

      const sizes: Record<string, number> = {};
      for (const [name, args] of Object.entries(TOOL_CALLS)) {
        sizes[name] = (await h.callText(name, args)).length;
      }
      // Rounded up to the nearest 500 bytes so trivial formatting changes do not churn it.
      const rounded = Object.fromEntries(
        Object.entries(sizes).map(([k, v]) => [k, Math.ceil(v / 500) * 500]),
      );
      expect(rounded).toMatchSnapshot();
    } finally {
      await h.close();
    }
  });
});

describe("default-leak table (E17-N1)", () => {
  /**
   * Which silent defaults leak into each tool's output for a user with no data. This table
   * shrinks as later tickets land; delete a value from a row when its default is removed.
   */
  const EXPECTED_LEAKS_FOR_EMPTY_USER: Record<string, Array<number | string>> = {
    calculate_self_assessment_and_section24: [],
    compare_mortgage_overpay_vs_isa: [350000, 220000],
    evaluate_cashflow_runway_and_health: [],
    evaluate_uk_student_loan: ["PLAN_2"],
    project_wealth_scenario: [15000],
    query_transactions_and_spending: [],
    simulate_debt_payoff: [],
    simulate_uk_tax_and_pension_sacrifice: [],
  };

  it("detects defaults for an empty user", async () => {
    const h = await connectTestClient(emptyUser);
    try {
      const leaks: Record<string, Array<number | string>> = {};
      for (const [name, args] of Object.entries(TOOL_CALLS)) {
        leaks[name] = detectDefaultLeaks(JSON.parse(await h.callText(name, args)));
      }
      expect(leaks).toEqual(EXPECTED_LEAKS_FOR_EMPTY_USER);
    } finally {
      await h.close();
    }
  });

  it("detectDefaultLeaks only reports values present as JSON values", () => {
    expect(detectDefaultLeaks({ a: 45000, b: [19.9], c: { d: "PLAN_2" } })).toEqual([
      45000,
      19.9,
      "PLAN_2",
    ]);
    expect(detectDefaultLeaks({ plan: "plan2" })).toEqual(["PLAN_2"]);
    expect(detectDefaultLeaks({ a: 1 })).toEqual([]);
  });
});
