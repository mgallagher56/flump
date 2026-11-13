import { describe, expect, it } from "vitest";
import { connectTestClient } from "../testing/client.js";
import { mortgageAndIsa } from "../testing/personas.js";
import {
  effectiveAnonymize,
  filterKnownScopes,
  hasScopes,
  PROMPT_SCOPES,
  RESOURCE_SCOPES,
  requirementFor,
  TOOL_SCOPES,
} from "./scopes.js";
import { hashPatToken, TokenVerifier, type VerifiedToken } from "./token-verifier.js";

const SIMULATE_TOOLS: Record<string, Record<string, unknown>> = {
  simulate_debt_payoff: { strategy: "COMPARE_BOTH" },
  simulate_uk_tax_and_pension_sacrifice: { employeePensionPct: 5 },
  compare_mortgage_overpay_vs_isa: {},
  calculate_self_assessment_and_section24: { taxYear: "2025/26" },
  project_wealth_scenario: {},
  evaluate_uk_student_loan: { currentBalanceGbp: 30000 },
};
const READ_TOOLS: Record<string, Record<string, unknown>> = {
  evaluate_cashflow_runway_and_health: {},
  query_transactions_and_spending: {},
};

function token(scopes: VerifiedToken["scopes"]): VerifiedToken {
  return { userId: "u1", scopes, anonymizeInstitutions: true, type: "pat" };
}

describe("scope helpers", () => {
  it("drops unknown scope strings", () => {
    expect(filterKnownScopes(["mcp:simulate", "admin", "mcp:read:full", "write:all"])).toEqual([
      "mcp:simulate",
      "mcp:read:full",
    ]);
  });

  it("requires a read scope for everything, plus simulate for simulators", () => {
    const sim = requirementFor("tool", "simulate_debt_payoff");
    expect(hasScopes(["mcp:simulate"], sim)).toBe(false);
    expect(hasScopes(["mcp:read:full"], sim)).toBe(false);
    expect(hasScopes(["mcp:read:full", "mcp:simulate"], sim)).toBe(true);
    expect(hasScopes(["mcp:read:anonymized"], requirementFor("resource", "budget"))).toBe(true);
    expect(hasScopes(["mcp:simulate"], requirementFor("prompt", "crush-high-apr-debt"))).toBe(
      false,
    );
  });

  it("falls back to the read requirement for unlisted names", () => {
    expect(hasScopes(["mcp:read:anonymized"], requirementFor("tool", "nope"))).toBe(true);
    expect(hasScopes(["mcp:simulate"], requirementFor("tool", "nope"))).toBe(false);
    expect(hasScopes(["mcp:read:full"], requirementFor("tool", "__proto__"))).toBe(true);
  });

  it("computes effective anonymisation", () => {
    expect(effectiveAnonymize(true, ["mcp:read:full"])).toBe(true);
    expect(effectiveAnonymize(false, ["mcp:read:full"])).toBe(false);
    expect(effectiveAnonymize(false, ["mcp:read:anonymized"])).toBe(true);
    expect(effectiveAnonymize(undefined, ["mcp:read:full"])).toBe(true);
  });

  it("lists every registered primitive", () => {
    expect(Object.keys(TOOL_SCOPES).length).toBe(8);
    expect(Object.keys(RESOURCE_SCOPES).length).toBe(6);
    expect(Object.keys(PROMPT_SCOPES).length).toBe(3);
  });
});

describe("TokenVerifier scope handling", () => {
  const raw = "flump_pat_0123456789abcdef0123456789abcdef";
  const verify = (scopes: string[], anonymizeInstitutions: boolean) =>
    new TokenVerifier({
      tokenStore: {
        async findTokenByHash() {
          return {
            id: "t1",
            userId: "u1",
            tokenHash: hashPatToken(raw),
            scopes,
            anonymizeInstitutions,
            expiresAt: null,
            revokedAt: null,
          };
        },
      },
    }).verifyAuthorizationHeader(`Bearer ${raw}`);

  it("filters unknown scopes", async () => {
    const t = await verify(["mcp:simulate", "bogus"], true);
    expect(t.scopes).toEqual(["mcp:simulate"]);
  });

  it("forces anonymisation without mcp:read:full", async () => {
    expect((await verify(["mcp:read:anonymized"], false)).anonymizeInstitutions).toBe(true);
    expect((await verify(["mcp:read:full"], false)).anonymizeInstitutions).toBe(false);
  });

  it("keeps the default PAT scopes anonymised", async () => {
    const t = await verify(["mcp:read:anonymized", "mcp:simulate"], true);
    expect(t.scopes).toEqual(["mcp:read:anonymized", "mcp:simulate"]);
    expect(t.anonymizeInstitutions).toBe(true);
  });
});

describe("scope enforcement through the MCP server", () => {
  async function withToken<T>(
    scopes: VerifiedToken["scopes"],
    fn: (h: Awaited<ReturnType<typeof connectTestClient>>) => Promise<T>,
  ) {
    const h = await connectTestClient(mortgageAndIsa, { token: token(scopes) });
    try {
      return await fn(h);
    } finally {
      await h.close();
    }
  }

  for (const [name, args] of Object.entries(SIMULATE_TOOLS)) {
    it(`${name}: needs read plus mcp:simulate`, async () => {
      await withToken(["mcp:simulate"], async (h) => {
        expect(await h.callText(name, args)).toContain("INSUFFICIENT_SCOPE");
      });
      await withToken(["mcp:read:anonymized"], async (h) => {
        expect(await h.callText(name, args)).toContain("INSUFFICIENT_SCOPE");
      });
      await withToken(["mcp:read:anonymized", "mcp:simulate"], async (h) => {
        expect(await h.callText(name, args)).not.toContain("INSUFFICIENT_SCOPE");
      });
    });
  }

  for (const [name, args] of Object.entries(READ_TOOLS)) {
    it(`${name}: needs read only`, async () => {
      await withToken(["mcp:simulate"], async (h) => {
        expect(await h.callText(name, args)).toContain("INSUFFICIENT_SCOPE");
      });
      await withToken(["mcp:read:anonymized"], async (h) => {
        expect(await h.callText(name, args)).not.toContain("INSUFFICIENT_SCOPE");
      });
    });
  }

  it("flags the call as an error and leaves tools/list unfiltered", async () => {
    await withToken(["mcp:simulate"], async (h) => {
      const res = await h.client.callTool({
        name: "query_transactions_and_spending",
        arguments: {},
      });
      expect(res.isError).toBe(true);
      const { tools } = await h.client.listTools();
      expect(tools.length).toBe(8);
    });
  });

  it("denies resources and prompts without a read scope", async () => {
    await withToken(["mcp:simulate"], async (h) => {
      await expect(h.client.readResource({ uri: "flump://context/budget" })).rejects.toThrow(
        "INSUFFICIENT_SCOPE",
      );
      await expect(
        h.client.getPrompt({ name: "uk-financial-health-audit", arguments: {} }),
      ).rejects.toThrow("INSUFFICIENT_SCOPE");
    });
  });

  it("allows resources and prompts with a read scope", async () => {
    await withToken(["mcp:read:anonymized"], async (h) => {
      const r = await h.client.readResource({ uri: "flump://context/budget" });
      expect(r.contents.length).toBeGreaterThan(0);
      const p = await h.client.getPrompt({ name: "crush-high-apr-debt", arguments: {} });
      expect(p.messages.length).toBeGreaterThan(0);
    });
  });
});
