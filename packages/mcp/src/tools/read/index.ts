import type { DefinedFlumpTool } from "../../define-tool.js";
import { getBalanceHistory } from "./getBalanceHistory.js";
import { getBudgetSummary } from "./getBudgetSummary.js";
import { getDataCoverage } from "./getDataCoverage.js";
import { getDebtOverview } from "./getDebtOverview.js";
import { getFinancialSnapshot } from "./getFinancialSnapshot.js";
import { getTaxYearPosition } from "./getTaxYearPosition.js";
import { listAccounts } from "./listAccounts.js";
import { listTaxRecords } from "./listTaxRecords.js";

/** Read tools (E17-N9 and the 2026-11 re-plan PR B), in the order they are listed to clients. */
export const READ_TOOLS: readonly DefinedFlumpTool[] = [
  getFinancialSnapshot,
  getBalanceHistory,
  getDataCoverage,
  listAccounts,
  getBudgetSummary,
  getDebtOverview,
  listTaxRecords,
  getTaxYearPosition,
];
