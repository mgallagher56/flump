import type { DefinedFlumpTool } from "../../define-tool.js";
import { compareMortgageOverpayVsInvest } from "./compareMortgageOverpayVsInvest.js";
import { evaluateStudentLoanOverpayment } from "./evaluateStudentLoanOverpayment.js";
import { projectNetWorth } from "./projectNetWorth.js";
import { simulateDebtPayoff } from "./simulateDebtPayoff.js";

/** Simulate tools v2 (E17-N11), in the order they are listed to clients. All need `mcp:simulate`. */
export const SIMULATE_TOOLS: readonly DefinedFlumpTool[] = [
  compareMortgageOverpayVsInvest,
  simulateDebtPayoff,
  projectNetWorth,
  evaluateStudentLoanOverpayment,
];
