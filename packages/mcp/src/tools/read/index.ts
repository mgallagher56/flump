import type { DefinedFlumpTool } from "../../define-tool.js";
import { getBudgetSummary } from "./getBudgetSummary.js";
import { getDebtOverview } from "./getDebtOverview.js";
import { getFinancialSnapshot } from "./getFinancialSnapshot.js";
import { getNetWorthHistory } from "./getNetWorthHistory.js";
import { listAccounts } from "./listAccounts.js";

/** Read tools v2 (E17-N9), in the order they are listed to clients. */
export const READ_TOOLS: readonly DefinedFlumpTool[] = [
  getFinancialSnapshot,
  getNetWorthHistory,
  listAccounts,
  getBudgetSummary,
  getDebtOverview,
];
