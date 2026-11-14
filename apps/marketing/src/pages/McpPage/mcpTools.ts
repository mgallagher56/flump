/**
 * The tools Flump MCP registers today, in the order `packages/mcp/src/server.ts` lists them
 * (`READ_TOOLS`, `SIMULATE_TOOLS`, `WRITE_TOOLS`). `McpPage.test.tsx` reads the tool names from
 * the `packages/mcp` source and fails if this list drifts from it.
 */
export type McpToolKind = "read" | "calculate" | "stage";

export interface McpToolEntry {
  name: string;
  kind: McpToolKind;
  description: string;
}

export const MCP_TOOLS: readonly McpToolEntry[] = [
  {
    name: "get_financial_snapshot",
    kind: "read",
    description:
      "A summary of your saved figures: net worth, cash, investments, pensions and debts. It adds what is left over each month and your months of cover when you have a budget. Anything you have not recorded is reported as not set, never guessed.",
  },
  {
    name: "get_balance_history",
    kind: "read",
    description:
      "Month-end balances recorded in Flump between two months, per account, per category or as a net worth total. Not yet available in the local preview.",
  },
  {
    name: "get_data_coverage",
    kind: "read",
    description:
      "Shows which months have a recorded balance for each account, and where the gaps are. Not yet available in the local preview.",
  },
  {
    name: "list_accounts",
    kind: "read",
    description:
      "Lists your saved accounts with a generic label, category and balance. Mortgages show the remaining term and fixed-rate end date when you have recorded them.",
  },
  {
    name: "get_budget_summary",
    kind: "read",
    description:
      "Monthly totals from your budget entries: income, essential and flexible spending, what is left over, and spending by category. Weekly and yearly entries are converted to monthly.",
  },
  {
    name: "get_debt_overview",
    kind: "read",
    description:
      "Your debts with balance, APR and minimum payment, plus overdraft, mortgage and student loan totals. An APR you have not recorded is reported as unknown, not guessed.",
  },
  {
    name: "list_tax_records",
    kind: "read",
    description:
      "The income and expense records you keep for a UK tax year, with totals by source and a month-by-month or per-category breakdown.",
  },
  {
    name: "get_tax_year_position",
    kind: "read",
    description:
      "Your UK tax position for a tax year, from your saved salary and tax records. It shows income by source and the Income Tax bands for your region. It also shows Class 4 National Insurance on self-employed profit and where income sits against the Personal Allowance taper.",
  },
  {
    name: "compare_mortgage_overpay_vs_invest",
    kind: "calculate",
    description:
      "Sets the interest saved by overpaying your recorded mortgage beside the growth on the same amount invested at a rate you choose. It states both and does not choose between them.",
  },
  {
    name: "simulate_debt_payoff",
    kind: "calculate",
    description:
      "Models paying off your recorded debts highest rate first (avalanche) and smallest balance first (snowball), with an optional extra monthly amount. Debts with no recorded APR are left out, not guessed.",
  },
  {
    name: "project_net_worth",
    kind: "calculate",
    description:
      "Estimates net worth year by year from your recorded balances. You can add up to 10 events, each with a one-off or monthly cost you set, and you choose the growth rate.",
  },
  {
    name: "stage_import",
    kind: "stage",
    description:
      "Stages your own account list and month-end balances as an import for you to review. It saves nothing: you check and confirm the import in Flump.",
  },
  {
    name: "get_import_status",
    kind: "stage",
    description:
      "Shows whether a staged import is waiting for you, confirmed, undone or expired. It cannot confirm anything.",
  },
];
