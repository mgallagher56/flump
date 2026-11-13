/**
 * MCP scope enforcement (E20-N17, using today's scope names).
 *
 * Every tool, resource and prompt needs `mcp:read:anonymized` or `mcp:read:full`.
 * Simulation tools additionally need `mcp:simulate`. Every registered primitive
 * must have an entry in the tables below (fail closed): the facade throws at
 * construction otherwise, and a runtime lookup of an unlisted name is denied.
 *
 * Known limit: `RegisteredTool.update({ callback })` replaces the handler and
 * bypasses the guard on facade-registered tools. Nothing calls it today. Tools built with
 * `defineFlumpTool` (E17-N8) check scopes themselves and throw if `update({ callback })` is used.
 */

export const MCP_SCOPES = ["mcp:read:anonymized", "mcp:read:full", "mcp:simulate"] as const;

export type McpScope = (typeof MCP_SCOPES)[number];

export const INSUFFICIENT_SCOPE = "INSUFFICIENT_SCOPE";

/** A requirement: at least one of `anyOf`, plus every scope in `allOf`. */
export interface ScopeRequirement {
  anyOf: readonly McpScope[];
  allOf: readonly McpScope[];
}

const READ: ScopeRequirement = {
  anyOf: ["mcp:read:anonymized", "mcp:read:full"],
  allOf: [],
};

const SIMULATE: ScopeRequirement = {
  anyOf: READ.anyOf,
  allOf: ["mcp:simulate"],
};

export const TOOL_SCOPES: Readonly<Record<string, ScopeRequirement>> = {
  // Read tools (E17-N9, plus the 2026-11 re-plan PR B query reads and the one tax tool).
  get_financial_snapshot: READ,
  get_balance_history: READ,
  get_data_coverage: READ,
  list_accounts: READ,
  get_budget_summary: READ,
  get_debt_overview: READ,
  list_tax_records: READ,
  get_tax_year_position: READ,
  // Simulate tools v2 (E17-N11), frozen by the re-plan. compare_* is deprecated, first to cut.
  compare_mortgage_overpay_vs_invest: SIMULATE,
  simulate_debt_payoff: SIMULATE,
  project_net_worth: SIMULATE,
};

/** `schema` is the data dictionary; it holds no user data but stays behind a read scope. */
export const RESOURCE_SCOPES: Readonly<Record<string, ScopeRequirement>> = {
  schema: READ,
};

/** No prompts until the re-plan's PR D adds `import-spreadsheet` and `monthly-check-in`. */
export const PROMPT_SCOPES: Readonly<Record<string, ScopeRequirement>> = {};

export type McpPrimitiveKind = "tool" | "resource" | "prompt";

const TABLES: Record<McpPrimitiveKind, Readonly<Record<string, ScopeRequirement>>> = {
  tool: TOOL_SCOPES,
  resource: RESOURCE_SCOPES,
  prompt: PROMPT_SCOPES,
};

/** Drops any scope string that is not one of today's known scopes. */
export function filterKnownScopes(scopes: readonly string[]): McpScope[] {
  const known = new Set<string>(MCP_SCOPES);
  return scopes.filter((s): s is McpScope => known.has(s));
}

/** Returns undefined for an unlisted name; callers must treat that as denied. */
export function requirementFor(kind: McpPrimitiveKind, name: string): ScopeRequirement | undefined {
  const table = TABLES[kind];
  return Object.hasOwn(table, name) ? table[name] : undefined;
}

export function hasScopes(
  held: readonly string[],
  required: ScopeRequirement | undefined,
): boolean {
  if (!required) return false;
  return (
    required.anyOf.some((s) => held.includes(s)) && required.allOf.every((s) => held.includes(s))
  );
}

/** Anonymised unless the record opts out AND the token holds `mcp:read:full`. */
export function effectiveAnonymize(
  recordAnonymize: boolean | null | undefined,
  scopes: readonly string[],
): boolean {
  return (recordAnonymize ?? true) || !scopes.includes("mcp:read:full");
}

export function insufficientScopeMessage(kind: McpPrimitiveKind, name: string): string {
  const req = requirementFor(kind, name);
  if (!req) return `${INSUFFICIENT_SCOPE}: ${kind} "${name}" has no scope entry.`;
  const needs = [`one of ${req.anyOf.join(" | ")}`, ...req.allOf].join(" and ");
  return `${INSUFFICIENT_SCOPE}: ${kind} "${name}" requires ${needs}.`;
}

function wrapLast(
  args: unknown[],
  kind: McpPrimitiveKind,
  name: string,
  held: readonly string[],
): unknown[] {
  const idx = args.length - 1;
  const handler = args[idx];
  if (!requirementFor(kind, name)) {
    throw new Error(
      `MCP ${kind} "${name}" has no scope entry; add it to ${kind.toUpperCase()}_SCOPES.`,
    );
  }
  if (typeof handler !== "function") {
    throw new Error(`MCP ${kind} "${name}": last registration argument must be a function.`);
  }
  const original = handler as (...a: unknown[]) => unknown;
  const guarded = (...handlerArgs: unknown[]) => {
    if (!hasScopes(held, requirementFor(kind, name))) {
      const message = insufficientScopeMessage(kind, name);
      if (kind === "tool") {
        return { isError: true, content: [{ type: "text", text: message }] };
      }
      throw new Error(message);
    }
    return original(...handlerArgs);
  };
  return [...args.slice(0, idx), guarded];
}

const KINDS: Record<string, McpPrimitiveKind> = {
  registerTool: "tool",
  tool: "tool",
  registerResource: "resource",
  resource: "resource",
  registerPrompt: "prompt",
  prompt: "prompt",
};

/**
 * Wraps an McpServer so registered handlers check scopes at call time.
 * Only the handler argument is replaced, so SDK overloads are untouched and
 * tool files need no changes. `tools/list` is deliberately not filtered.
 */
export function withScopeEnforcement<T extends object>(
  server: T,
  heldScopes: readonly string[],
): T {
  const held = filterKnownScopes(heldScopes);
  return new Proxy(server, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target) as unknown;
      if (typeof value !== "function") return value;
      const fn = value as (...a: unknown[]) => unknown;
      const kind = typeof prop === "string" ? KINDS[prop] : undefined;
      if (!kind) return fn.bind(target);
      return (...args: unknown[]) => fn.apply(target, wrapLast(args, kind, String(args[0]), held));
    },
  });
}
