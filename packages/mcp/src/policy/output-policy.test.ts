import { MCP_NOTICE } from "@flump/finance-engine";
import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/client.js";
import {
  emptyUser,
  mixedAccountsWithHistory,
  mortgageAndIsa,
  renterWithUnknownAprCard,
} from "../testing/personas.js";
import { MINIMAL_TOOL_ARGS } from "../testing/tool-args.js";
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
  monthlySetAsideEstimateGbp: 410,
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

  it("has no allow-list: recommendedMonthlyTaxSetAsideGbp is banned like any other recommend key", () => {
    expect(() =>
      assertToolOutputPolicy({ ...good, deep: { recommendedMonthlyTaxSetAsideGbp: 99 } }),
    ).toThrow(/banned-key/);
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

// Empty since the 2026-11 re-plan PR A+B: the advisor prompts and legacy tax tools are deleted, and
// every read tool now carries MCP_NOTICE (its caveats moved to `result.notes`).
const ALLOW_LIST: AllowEntry[] = [];

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
  ...Object.entries(MINIMAL_TOOL_ARGS).map(([name, args]) => ({ name, args })),
  { name: "simulate_debt_payoff", args: { includeSchedule: "yearly", extraMonthlyGbp: 50 } },
  {
    name: "project_net_worth",
    args: { expectedReturnPct: 5, events: [{ label: "Car", startYear: 2, lumpSumCostGbp: 15000 }] },
  },
  {
    name: "get_balance_history",
    args: {
      from: "2024-01",
      to: "2026-10",
      groupBy: "account",
      metric: "pctDelta",
      interval: "quarter",
      responseFormat: "detailed",
    },
  },
  { name: "get_financial_snapshot", args: { asOfMonth: "2026-09" } },
  {
    name: "list_tax_records",
    args: { taxYear: "2025/26", groupBy: "month", responseFormat: "detailed" },
  },
];

describe("MCP surface output policy (E29-T6)", () => {
  it("every tool result, tool description, prompt and prompt description is policy-clean apart from the expiring allow-list", async () => {
    const found: Array<{ surface: string; v: PolicyViolation }> = [];

    for (const persona of [
      mortgageAndIsa,
      renterWithUnknownAprCard,
      emptyUser,
      mixedAccountsWithHistory,
    ]) {
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

        // No prompts are registered (re-plan PR A); PR D's prompts must be added to this walk.
        expect(h.client.getServerCapabilities()?.prompts).toBeUndefined();
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
