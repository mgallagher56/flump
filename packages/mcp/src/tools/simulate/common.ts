import { MCP_NOTICE } from "@flump/finance-engine";
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { ToolOutput } from "../../envelope.js";
import { round2 } from "../read/common.js";

export { round2 };

/**
 * Notice carried by every simulation result. The output policy (E29-T6) requires this exact text,
 * so extra caveats go in `assumptions[]` or `result.notes`, never in `notice`.
 */
export const SIMULATION_NOTICE = MCP_NOTICE;

export const SIMULATE_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export type Assumption = NonNullable<ToolOutput<unknown>["assumptions"]>[number];

/** A value the agent supplied in the call, echoed back so the answer can state it. */
export const agentSupplied = (
  field: string,
  value: number | string,
  reason: string,
): Assumption => ({
  field,
  value,
  source: "agent_supplied",
  reason,
});

/** A value the tool filled in because the agent left the argument out. */
export const defaulted = (field: string, value: number | string, reason: string): Assumption => ({
  field,
  value,
  source: "default",
  reason,
});

export const derived = (field: string, reason: string, value?: number | string): Assumption => ({
  field,
  ...(value === undefined ? {} : { value }),
  source: "derived",
  reason,
});

export const fromProfile = (field: string, value: number | string, reason: string): Assumption => ({
  field,
  value,
  source: "user_profile",
  reason,
});

/** Annual percentage the agent supplies: 0 to 30, never a fraction (5 means 5%). */
export const pctInput = (description: string) => z.number().min(0).max(30).describe(description);

export const gbpInput = (description: string, max = 10_000_000) =>
  z.number().min(0).max(max).describe(description);
