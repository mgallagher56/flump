import type { DefinedFlumpTool } from "../../define-tool.js";
import { compareMortgageOverpayVsInvest } from "./compareMortgageOverpayVsInvest.js";
import { projectNetWorth } from "./projectNetWorth.js";
import { simulateDebtPayoff } from "./simulateDebtPayoff.js";

/**
 * Simulate tools v2 (E17-N11), in the order they are listed to clients. All need `mcp:simulate`.
 * The 2026-11 re-plan froze this list: `compare_mortgage_overpay_vs_invest` is deprecated and first to cut.
 */
export const SIMULATE_TOOLS: readonly DefinedFlumpTool[] = [
  compareMortgageOverpayVsInvest,
  simulateDebtPayoff,
  projectNetWorth,
];
