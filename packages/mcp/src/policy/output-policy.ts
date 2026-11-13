import { ADVICE_PATTERNS, MCP_NOTICE } from "@flump/finance-engine";

/**
 * MCP output policy (E29-T6): machine-checkable "no personal product recommendations" for
 * every tool result, tool description and prompt. It walks generic JSON, so it does not
 * depend on the E17-N8 envelope shape beyond the required top-level `notice`.
 */

export type PolicyViolationKind = "advice-language" | "banned-key" | "provider-name" | "notice";

export interface PolicyViolation {
  kind: PolicyViolationKind;
  /** JSON path of the offending value or key, e.g. `$.summary[2]`. */
  path: string;
  /** Pattern id, key name or provider name that matched. */
  detail: string;
  /** The offending text (truncated). */
  text: string;
}

export class OutputPolicyError extends Error {
  readonly violations: PolicyViolation[];
  constructor(violations: PolicyViolation[]) {
    super(
      `MCP output policy: ${violations.length} violation(s)\n${violations
        .map((v) => `  [${v.kind}] ${v.path} (${v.detail}): ${v.text}`)
        .join("\n")}`,
    );
    this.name = "OutputPolicyError";
    this.violations = violations;
  }
}

/** Keys that imply a personal recommendation or an outcome guarantee. */
export const BANNED_KEY_PATTERN = /recommend|favou?rsOption|^best|guaranteed/i;

/**
 * Permanent allow-list of banned-key matches, each with a reason. Never loosen the pattern.
 * `recommendedMonthlyTaxSetAsideGbp` is a tax set-aside figure (HMRC), not an FCA product
 * recommendation; a rename to a neutral key is suggested to E17-N12.
 */
export const PERMANENT_KEY_ALLOW_LIST: ReadonlyArray<{ key: string; reason: string }> = [
  {
    key: "recommendedMonthlyTaxSetAsideGbp",
    reason: "Tax set-aside figure, not an FCA product recommendation. Rename suggested to N12.",
  },
];

/** Providers and platforms the MCP must never name in output (no product steering). */
export const PROVIDER_NAMES: readonly string[] = [
  "Vanguard",
  "Hargreaves Lansdown",
  "AJ Bell",
  "Nutmeg",
  "Moneybox",
  "Freetrade",
  "Trading 212",
  "Fidelity",
  "Monzo",
  "Barclays",
  "Lloyds",
  "Halifax",
  "Santander",
  "HSBC",
  "NatWest",
];

const PROVIDER_PATTERNS = PROVIDER_NAMES.map((name) => ({
  name,
  pattern: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
}));

const clip = (s: string) => (s.length > 120 ? `${s.slice(0, 117)}...` : s);

/** Violations in one string value: advice language and provider names. */
export function collectStringViolations(text: string, path: string): PolicyViolation[] {
  const out: PolicyViolation[] = [];
  for (const { id, pattern } of ADVICE_PATTERNS) {
    if (pattern.test(text)) {
      out.push({ kind: "advice-language", path, detail: id, text: clip(text) });
    }
  }
  for (const { name, pattern } of PROVIDER_PATTERNS) {
    if (pattern.test(text)) {
      out.push({ kind: "provider-name", path, detail: name, text: clip(text) });
    }
  }
  return out;
}

function walk(value: unknown, path: string, out: PolicyViolation[]): void {
  if (typeof value === "string") {
    out.push(...collectStringViolations(value, path));
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => {
      walk(v, `${path}[${i}]`, out);
    });
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      const keyPath = `${path}.${key}`;
      const allowed = PERMANENT_KEY_ALLOW_LIST.some((a) => a.key === key);
      if (!allowed && BANNED_KEY_PATTERN.test(key)) {
        out.push({ kind: "banned-key", path: keyPath, detail: key, text: key });
      }
      walk(v, keyPath, out);
    }
  }
}

/** Every policy violation in a tool result, without throwing. */
export function collectToolOutputViolations(output: unknown): PolicyViolation[] {
  const out: PolicyViolation[] = [];
  const notice =
    output && typeof output === "object" ? (output as Record<string, unknown>).notice : undefined;
  if (notice !== MCP_NOTICE) {
    out.push({
      kind: "notice",
      path: "$.notice",
      detail: "MCP_NOTICE",
      text: typeof notice === "string" ? clip(notice) : "missing",
    });
  }
  walk(output, "$", out);
  return out;
}

/** Throws `OutputPolicyError` unless the tool result is policy-clean and carries `MCP_NOTICE`. */
export function assertToolOutputPolicy(output: unknown): void {
  const violations = collectToolOutputViolations(output);
  if (violations.length > 0) throw new OutputPolicyError(violations);
}

/** Every policy violation in a tool description or prompt text. No `notice` is required. */
export function collectDescriptionViolations(text: string): PolicyViolation[] {
  return collectStringViolations(text, "$");
}

/** Throws `OutputPolicyError` if a tool description or prompt text breaks the policy. */
export function assertDescriptionPolicy(text: string): void {
  const violations = collectDescriptionViolations(text);
  if (violations.length > 0) throw new OutputPolicyError(violations);
}
