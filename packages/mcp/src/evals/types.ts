/** Shared types for the MCP eval harness (E17-N21). Pure data, no I/O. */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JourneyId = "J1" | "J2" | "J3" | "J4" | "J5" | "J6" | "J7" | "J8" | "J9" | "J10";

export type AccountCategory =
  | "cash"
  | "investment"
  | "pension"
  | "property"
  | "mortgage"
  | "consumer_debt"
  | "other";

/** Categories that count against net worth. */
export const LIABILITY_CATEGORIES: readonly AccountCategory[] = ["mortgage", "consumer_debt"];

export interface PersonaAccount {
  id: string;
  name: string;
  category: AccountCategory;
  /** Always a positive magnitude; liabilities are identified by category. */
  balanceGbp: number;
  /** `null` means the APR is genuinely unknown (the agent must ask, never invent). */
  aprPct?: number | null;
  remainingTermMonths?: number;
  monthlyContributionGbp?: number;
}

export interface PersonaProfile {
  annualSalaryGbp?: number;
  bonusGbp?: number;
  region?: "england" | "scotland" | "wales" | "northern_ireland";
  studentLoanPlan?: "plan1" | "plan2" | "plan4" | "plan5" | "postgrad";
  studentLoanBalanceGbp?: number;
}

export interface PersonaBudget {
  monthlyIncomeGbp: number;
  monthlyEssentialsGbp: number;
  monthlyDiscretionaryGbp: number;
}

/**
 * A synthetic user, expressed as provider rows. When E23 P1-6 fixtures land
 * (`packages/finance-engine/src/picture/__fixtures__/`) these should be
 * re-exported from there, not forked.
 */
export interface Persona {
  id: string;
  label: string;
  profile: PersonaProfile;
  accounts: PersonaAccount[];
  budget?: PersonaBudget;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, JsonValue>;
}

/** A recorded agent run: the tool calls it made, in order, and its final answer. */
export interface Transcript {
  taskId: string;
  toolCalls: ToolCall[];
  finalText: string;
  usage?: { inputTokens: number; outputTokens: number };
}

/** Marker meaning "the argument must be present, any value". */
export const ANY = "<any>" as const;

export type Behaviour =
  | "asks_for_missing_input"
  | "no_write_without_confirmation"
  | "refuses_delete"
  | "no_product_recommendation"
  | "states_assumption"
  | "flags_unverified"
  | "ignores_injected_instructions";

export interface ExpectedNumber {
  label: string;
  value: number;
  unit: "gbp" | "pct";
}

export interface GoldenTask {
  id: string;
  journey: JourneyId;
  personaId: string;
  prompt: string;
  /** Every tool listed here must be called at least once. */
  expectedTools: string[];
  /** None of these may be called. */
  forbiddenTools?: string[];
  /** For each tool, arguments that some call to it must carry (`ANY` = present, any value). */
  requiredArgs?: Record<string, Record<string, JsonValue>>;
  /** Figures the final answer must state, within the tolerance below. */
  expectedNumbers?: ExpectedNumber[];
  behaviours: Behaviour[];
}

export interface Check {
  name: string;
  passed: boolean;
  detail?: string;
}

export interface TaskGrade {
  taskId: string;
  passed: boolean;
  checks: Check[];
}

/** Tolerance for numeric answers: within GBP 1 or 0.5%, whichever is looser. */
export const TOLERANCE_ABS_GBP = 1;
export const TOLERANCE_REL = 0.005;
