import { MCP_NOTICE } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/client.js";
import { emptyUser, mortgageAndIsa, renterWithUnknownAprCard } from "../testing/personas.js";
import {
  assertDescriptionPolicy,
  assertToolOutputPolicy,
  collectDescriptionViolations,
  collectToolOutputViolations,
  OutputPolicyError,
  type PolicyViolation,
} from "./output-policy.js";

const good = {
  notice: MCP_NOTICE,
  netWorthGbp: 12000,
  summary: ["Your debts total £2,400.", "At £100 a month the card clears in 26 months."],
  recommendedMonthlyTaxSetAsideGbp: 410,
};

describe("assertToolOutputPolicy (unit)", () => {
  it("accepts a clean result that carries MCP_NOTICE", () => {
    expect(() => assertToolOutputPolicy(good)).not.toThrow();
  });

  it("rejects a result with no notice, or a different notice", () => {
    const { notice: _n, ...noNotice } = good;
    expect(() => assertToolOutputPolicy(noNotice)).toThrow(OutputPolicyError);
    expect(() => assertToolOutputPolicy({ ...good, notice: "Guidance only." })).toThrow(/notice/);
    expect(() => assertToolOutputPolicy([good])).toThrow(/notice/);
  });

  it("rejects advice language in any nested string", () => {
    for (const text of [
      "You should overpay the mortgage.",
      "We recommend an ISA.",
      "The optimal split is 60/40.",
      "Move £200 into your ISA each month.",
      "Maximise your pension.",
    ]) {
      expect(() => assertToolOutputPolicy({ ...good, a: { b: [text] } }), text).toThrow(
        /advice-language/,
      );
    }
  });

  it("reports the JSON path of the offence", () => {
    const v = collectToolOutputViolations({ ...good, a: { b: ["fine", "You should act."] } });
    expect(v).toEqual([expect.objectContaining({ kind: "advice-language", path: "$.a.b[1]" })]);
  });

  it("bans recommendation-shaped keys", () => {
    for (const key of [
      "recommendation",
      "recommendations",
      "topRecommendations",
      "favorsOption",
      "favoursOption",
      "bestOption",
      "guaranteedInterestSavedGbp",
    ]) {
      expect(() => assertToolOutputPolicy({ ...good, nested: { [key]: 1 } }), key).toThrow(
        /banned-key/,
      );
    }
  });

  it("allows recommendedMonthlyTaxSetAsideGbp permanently (tax, not FCA)", () => {
    expect(() =>
      assertToolOutputPolicy({ ...good, deep: { recommendedMonthlyTaxSetAsideGbp: 99 } }),
    ).not.toThrow();
  });

  it("bans provider names but not lookalike words", () => {
    expect(() => assertToolOutputPolicy({ ...good, a: "Open a Vanguard ISA" })).toThrow(
      /provider-name/,
    );
    expect(() => assertToolOutputPolicy({ ...good, a: "Move it to Monzo" })).toThrow(/provider/);
    expect(() =>
      assertToolOutputPolicy({ ...good, a: "Your Test Stocks ISA holds £32,000" }),
    ).not.toThrow();
    expect(() =>
      assertToolOutputPolicy({ ...good, a: "Vanguardian is not a provider name" }),
    ).not.toThrow();
    for (const text of [
      "The nationwide average rate is 4.5%.",
      "A starling flew past.",
      "Marcus is a first name.",
    ]) {
      expect(() => assertToolOutputPolicy({ ...good, a: text }), text).not.toThrow();
    }
  });
});

describe("assertDescriptionPolicy (unit)", () => {
  it("accepts guidance-worded descriptions", () => {
    expect(() =>
      assertDescriptionPolicy(
        "Compares the interest saved by overpaying a mortgage with the growth on the same cash in an ISA.",
      ),
    ).not.toThrow();
  });

  it("rejects advice language and provider names, and needs no notice", () => {
    expect(() => assertDescriptionPolicy("Models the optimal pension contribution.")).toThrow(
      OutputPolicyError,
    );
    expect(() => assertDescriptionPolicy("Works best with Nutmeg accounts.")).toThrow(
      /provider-name/,
    );
    expect(collectDescriptionViolations("Calculates income tax.")).toEqual([]);
  });
});

/**
 * Expiring allow-list of CURRENT violations on the live surface. Each entry names the E17
 * ticket that removes it. The surface test fails when an entry expires, and when an entry no
 * longer matches anything (so the owner deletes it in the same PR that fixes the violation).
 * Do not add entries for new work: fix the wording instead.
 */
interface AllowEntry {
  /** `tool:<name>`, `tool-desc:<name>`, `prompt:<name>` or `prompt-desc:<name>`; `*` suffix is a wildcard. */
  surface: string;
  kind: PolicyViolation["kind"];
  /** Pattern id, key name or provider name; omit to cover every detail of that kind. */
  detail?: string;
  owner: string;
  /** ISO date after which this entry fails the build. */
  expires: string;
}

const EXPIRES = "2027-03-31";
const ALLOW_LIST: AllowEntry[] = [
  // Every tool result lacks `notice` until the N8 envelope lands.
  { surface: "tool:*", kind: "notice", owner: "E17-N8", expires: EXPIRES },
  // mortgage-isa.tool.ts: guaranteedInterestSavedGbp, favorsOption.
  {
    surface: "tool:compare_mortgage_overpay_vs_isa",
    kind: "banned-key",
    detail: "guaranteedInterestSavedGbp",
    owner: "E17-N11",
    expires: EXPIRES,
  },
  {
    surface: "tool:compare_mortgage_overpay_vs_isa",
    kind: "banned-key",
    detail: "favorsOption",
    owner: "E17-N11",
    expires: EXPIRES,
  },
  // mortgage-isa.tool.ts early return when there is no mortgage balance.
  {
    surface: "tool:compare_mortgage_overpay_vs_isa",
    kind: "banned-key",
    detail: "recommendation",
    owner: "E17-N11",
    expires: EXPIRES,
  },
  // financial-audit.tool.ts student loan `recommendation`. (healthScore.recommendations was
  // renamed to observations by E29-T5, #553, so its entry is gone.)
  {
    surface: "tool:evaluate_uk_student_loan",
    kind: "banned-key",
    detail: "recommendation",
    owner: "E17-N11",
    expires: EXPIRES,
  },
  // uk-tax-trap.tool.ts description ("optimal pension salary sacrifice").
  {
    surface: "tool-desc:simulate_uk_tax_and_pension_sacrifice",
    kind: "advice-language",
    detail: "optimal",
    owner: "E17-N12",
    expires: EXPIRES,
  },
  // uk-advisor.prompts.ts: prompt text and the escape-100k description.
  ...["recommend", "high-impact"].map((detail) => ({
    surface: "prompt:uk-financial-health-audit",
    kind: "advice-language" as const,
    detail,
    owner: "E17-N14",
    expires: EXPIRES,
  })),
  {
    surface: "prompt:escape-100k-tax-trap",
    kind: "advice-language",
    detail: "maximise",
    owner: "E17-N14",
    expires: EXPIRES,
  },
  {
    surface: "prompt-desc:escape-100k-tax-trap",
    kind: "advice-language",
    detail: "optimal",
    owner: "E17-N14",
    expires: EXPIRES,
  },
];

const surfaceMatches = (entry: string, surface: string) =>
  entry.endsWith("*") ? surface.startsWith(entry.slice(0, -1)) : entry === surface;

const matches = (e: AllowEntry, surface: string, v: PolicyViolation) =>
  surfaceMatches(e.surface, surface) &&
  e.kind === v.kind &&
  (e.detail === undefined || e.detail === v.detail);

/**
 * Minimal valid arguments per tool, as in the N1 harness (`output-size.test.ts`), plus extra
 * calls that reach early-return branches no persona hits (zero mortgage balance).
 */
const TOOL_CALLS: Array<{ name: string; args: Record<string, unknown> }> = [
  { name: "simulate_debt_payoff", args: { strategy: "COMPARE_BOTH" } },
  { name: "simulate_uk_tax_and_pension_sacrifice", args: { employeePensionPct: 5 } },
  { name: "compare_mortgage_overpay_vs_isa", args: {} },
  { name: "compare_mortgage_overpay_vs_isa", args: { hypotheticalMortgageBalanceGbp: 0 } },
  { name: "calculate_self_assessment_and_section24", args: { taxYear: "2025/26" } },
  { name: "project_wealth_scenario", args: {} },
  { name: "evaluate_cashflow_runway_and_health", args: {} },
  { name: "evaluate_uk_student_loan", args: { plan: "PLAN_5", currentBalanceGbp: 30000 } },
  { name: "query_transactions_and_spending", args: {} },
];

describe("MCP surface output policy (E29-T6)", () => {
  it("every tool result, tool description, prompt and prompt description is policy-clean apart from the expiring allow-list", async () => {
    const found: Array<{ surface: string; v: PolicyViolation }> = [];

    for (const persona of [mortgageAndIsa, renterWithUnknownAprCard, emptyUser]) {
      const h = await connectTestClient(persona);
      try {
        const { tools } = await h.client.listTools();
        // A new tool must be added to TOOL_CALLS so it cannot escape the policy.
        expect(tools.map((t) => t.name).sort()).toEqual(
          [...new Set(TOOL_CALLS.map((c) => c.name))].sort(),
        );

        for (const t of tools) {
          for (const v of collectDescriptionViolations(t.description ?? "")) {
            found.push({ surface: `tool-desc:${t.name}`, v });
          }
        }
        for (const { name, args } of TOOL_CALLS) {
          const output = await h.callJson(name, args);
          for (const v of collectToolOutputViolations(output)) {
            found.push({ surface: `tool:${name}`, v });
          }
        }

        const { prompts } = await h.client.listPrompts();
        expect(prompts.length).toBeGreaterThan(0);
        for (const p of prompts) {
          for (const v of collectDescriptionViolations(p.description ?? "")) {
            found.push({ surface: `prompt-desc:${p.name}`, v });
          }
          const result = await h.client.getPrompt({ name: p.name });
          for (const m of result.messages) {
            const text = m.content.type === "text" ? m.content.text : "";
            for (const v of collectDescriptionViolations(text)) {
              found.push({ surface: `prompt:${p.name}`, v });
            }
          }
        }
      } finally {
        await h.close();
      }
    }

    const unallowed = found.filter(
      ({ surface, v }) => !ALLOW_LIST.some((e) => matches(e, surface, v)),
    );
    expect(
      unallowed.map(({ surface, v }) => `${surface} [${v.kind}] ${v.path} ${v.detail}`),
    ).toEqual([]);

    const stale = ALLOW_LIST.filter((e) => !found.some(({ surface, v }) => matches(e, surface, v)));
    expect(
      stale.map((e) => `${e.surface} ${e.kind} ${e.detail ?? "*"} (${e.owner})`),
      "allow-list entry no longer matches a violation: delete it",
    ).toEqual([]);
  }, 60_000);

  it("allow-list entries have not expired", () => {
    const today = new Date().toISOString().slice(0, 10);
    const expired = ALLOW_LIST.filter((e) => e.expires < today);
    expect(expired.map((e) => `${e.surface} ${e.kind} (${e.owner}, expired ${e.expires})`)).toEqual(
      [],
    );
  });
});
