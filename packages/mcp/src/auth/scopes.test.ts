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
  withScopeEnforcement,
} from "./scopes.js";
import { hashPatToken, TokenVerifier, type VerifiedToken } from "./token-verifier.js";

const CALL_ARGS: Record<string, Record<string, unknown>> = {
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

  it("denies unlisted names at runtime", () => {
    expect(requirementFor("tool", "nope")).toBeUndefined();
    expect(hasScopes(["mcp:read:full", "mcp:simulate"], requirementFor("tool", "nope"))).toBe(
      false,
    );
    expect(hasScopes(["mcp:read:full"], requirementFor("tool", "__proto__"))).toBe(false);
  });

  it("throws at construction for unlisted names or non-function handlers", () => {
    const fake = {
      registerTool: () => undefined,
      resource: () => undefined,
    };
    const scoped = withScopeEnforcement(fake, ["mcp:read:full"]);
    expect(() => scoped.registerTool("unlisted", {}, async () => ({}))).toThrow("no scope entry");
    expect(() =>
      (scoped.registerTool as (...a: unknown[]) => void)("simulate_debt_payoff", {}),
    ).toThrow("must be a function");
    expect(() =>
      scoped.resource("budget", "flump://context/budget", async () => ({})),
    ).not.toThrow();
  });

  it("computes effective anonymisation", () => {
    expect(effectiveAnonymize(true, ["mcp:read:full"])).toBe(true);
    expect(effectiveAnonymize(false, ["mcp:read:full"])).toBe(false);
    expect(effectiveAnonymize(false, ["mcp:read:anonymized"])).toBe(true);
    expect(effectiveAnonymize(undefined, ["mcp:read:full"])).toBe(true);
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

const RESOURCE_URIS: Record<string, string> = {
  "executive-snapshot": "flump://context/executive-snapshot",
  baseline: "flump://context/baseline",
  accounts: "flump://context/accounts",
  budget: "flump://context/budget",
  "tax-ledger": "flump://context/tax-ledger",
};
const ALL: VerifiedToken["scopes"] = ["mcp:read:anonymized", "mcp:read:full", "mcp:simulate"];

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

  it("scope tables match the real server surface exactly", async () => {
    await withToken(ALL, async (h) => {
      const tools = (await h.client.listTools()).tools.map((t) => t.name).sort();
      const resources = (await h.client.listResources()).resources.map((r) => r.name).sort();
      const prompts = (await h.client.listPrompts()).prompts.map((p) => p.name).sort();
      expect(tools).toEqual(Object.keys(TOOL_SCOPES).sort());
      expect(resources).toEqual(Object.keys(RESOURCE_SCOPES).sort());
      expect(prompts).toEqual(Object.keys(PROMPT_SCOPES).sort());
      expect(Object.keys(RESOURCE_URIS).sort()).toEqual(resources);
    });
  });

  it("has call args for every listed tool", () => {
    expect(Object.keys(CALL_ARGS).sort()).toEqual(Object.keys(TOOL_SCOPES).sort());
  });

  for (const [name, req] of Object.entries(TOOL_SCOPES)) {
    const needsSimulate = req.allOf.includes("mcp:simulate");
    it(`${name}: enforces ${needsSimulate ? "read plus mcp:simulate" : "read only"}`, async () => {
      const args = CALL_ARGS[name] ?? {};
      await withToken(["mcp:simulate"], async (h) => {
        expect(await h.callText(name, args)).toContain("INSUFFICIENT_SCOPE");
      });
      await withToken(["mcp:read:anonymized"], async (h) => {
        const text = await h.callText(name, args);
        if (needsSimulate) expect(text).toContain("INSUFFICIENT_SCOPE");
        else expect(text).not.toContain("INSUFFICIENT_SCOPE");
      });
      await withToken(["mcp:read:anonymized", "mcp:simulate"], async (h) => {
        expect(await h.callText(name, args)).not.toContain("INSUFFICIENT_SCOPE");
      });
    });
  }

  it("flags the call as an error and leaves tools/list unfiltered", async () => {
    await withToken(["mcp:simulate"], async (h) => {
      const res = await h.client.callTool({
        name: "get_debt_overview",
        arguments: {},
      });
      expect(res.isError).toBe(true);
      expect((await h.client.listTools()).tools.length).toBe(Object.keys(TOOL_SCOPES).length);
    });
  });

  for (const name of Object.keys(RESOURCE_SCOPES)) {
    it(`resource ${name}: denied without read, allowed with read`, async () => {
      const uri = RESOURCE_URIS[name] as string;
      await withToken(["mcp:simulate"], async (h) => {
        await expect(h.client.readResource({ uri })).rejects.toThrow("INSUFFICIENT_SCOPE");
      });
      await withToken(["mcp:read:anonymized"], async (h) => {
        expect((await h.client.readResource({ uri })).contents.length).toBeGreaterThan(0);
      });
    });
  }

  for (const name of Object.keys(PROMPT_SCOPES)) {
    it(`prompt ${name}: denied without read, allowed with read`, async () => {
      await withToken(["mcp:simulate"], async (h) => {
        await expect(h.client.getPrompt({ name, arguments: {} })).rejects.toThrow(
          "INSUFFICIENT_SCOPE",
        );
      });
      await withToken(["mcp:read:anonymized"], async (h) => {
        expect((await h.client.getPrompt({ name, arguments: {} })).messages.length).toBeGreaterThan(
          0,
        );
      });
    });
  }
});
