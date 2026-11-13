/**
 * Minimal valid arguments per registered tool, shared by the surface, size, scope and policy tests.
 * Every tool in `TOOL_SCOPES` must have an entry (each of those tests asserts it).
 */
export const MINIMAL_TOOL_ARGS: Readonly<Record<string, Record<string, unknown>>> = {
  get_financial_snapshot: {},
  get_balance_history: { from: "2026-01", to: "2026-10" },
  get_data_coverage: {},
  list_accounts: {},
  get_budget_summary: {},
  get_debt_overview: {},
  list_tax_records: { taxYear: "2025/26" },
  get_tax_year_position: { taxYear: "2025/26" },
  compare_mortgage_overpay_vs_invest: { monthlyAmountGbp: 300, expectedReturnPct: 5 },
  simulate_debt_payoff: {},
  project_net_worth: { expectedReturnPct: 5 },
};
