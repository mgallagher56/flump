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
  stage_import: {
    idempotencyKey: "minimal-key-0001",
    accounts: [{ ref: "acc1", name: "Everyday account", type: "Current" }],
    balances: [{ accountRef: "acc1", month: "2026-01", value: 1250.5 }],
  },
  // The batch every fake staging provider starts with (testing/fake-imports.ts).
  get_import_status: { batchId: "6f1c2b8e-4a3d-4e5f-9a7b-1c2d3e4f5a6b" },
};
