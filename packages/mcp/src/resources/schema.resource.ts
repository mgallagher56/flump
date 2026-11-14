import { ALL_TAX_CATEGORIES } from "@flump/finance-engine";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ACCOUNT_CATEGORIES } from "../tools/read/common.js";
import { TAX_SOURCES } from "../tools/read/tax-common.js";

export const SCHEMA_RESOURCE_URI = "flump://schema";

const LIABILITY_CATEGORIES = new Set(["debt", "mortgages", "studentLoans"]);

const CATEGORY_MEANING: Record<(typeof ACCOUNT_CATEGORIES)[number], string> = {
  cash: "Current accounts. An overdrawn balance is negative.",
  savings: "Savings accounts and cash ISAs.",
  investments: "Investment accounts, including stocks and shares ISAs.",
  pensions: "Pension pots.",
  debt: "Credit cards, loans, overdraft facilities and money owed.",
  mortgages: "Mortgages.",
  property: "Property value.",
  studentLoans:
    "UK student loans. Income-contingent, so left out of net worth, debt totals and monthly history.",
  other: "Anything else.",
};

/**
 * The data dictionary: what the stored data means, independent of any user. Contains no user data,
 * so it is the same for every token.
 */
export const SCHEMA_DOCUMENT = {
  schemaVersion: "1",
  currency: "GBP. Every money figure is in pounds sterling, rounded to the penny.",
  ids: "Accounts and tax records are named by short opaque ids (acc_..., tax_...) that are stable for one access token. Labels such as 'Saving #2' are generic unless the token has full read access.",
  signConvention:
    "Assets keep their real sign (an overdrawn current account is negative). Liabilities (debts, mortgages, student loans) are always the amount owed as a positive number, so a falling liability is a smaller debt. Net worth is assets minus liabilities, excluding student loans.",
  accountCategories: ACCOUNT_CATEGORIES.map((id) => ({
    id,
    isLiability: LIABILITY_CATEGORIES.has(id),
    meaning: CATEGORY_MEANING[id],
  })),
  monthlyHistory: {
    grain:
      "One value per account per calendar month (Europe/London), the balance at month end. A later value for the same month replaces the earlier one.",
    carryForward:
      "A month with no recorded value shows the account's last earlier value, flagged carriedForward. Carried values are worked out when read, never stored.",
    sources: {
      onboarding: "Entered while setting up Flump.",
      manual: "Entered or edited by the user.",
      connected: "Read from a connected bank.",
      backfill: "Filled in from earlier records when history storage was introduced.",
    },
    changes: "Every change is current minus previous, whether the figure went up or down.",
  },
  taxRecords: {
    taxYear:
      "UK tax years run 6 April to 5 April and are written 2025/26. Records are bucketed by calendar month, so April belongs wholly to the year that starts in it.",
    frequencies: {
      "one-off": "Counts once, in the month of its date.",
      monthly: "Counts every month from its date to its end date (or indefinitely).",
      annual: "Counts once, in the month of its date, in the tax year containing that date.",
    },
    sources: TAX_SOURCES,
    categories: ALL_TAX_CATEGORIES.map((c) => ({ id: c.id, source: c.source, type: c.type })),
  },
  tools: {
    get_financial_snapshot: "Current totals, or totals as at a past month (asOfMonth).",
    get_balance_history: "Balances over time by account, category or total.",
    get_data_coverage: "Which months have recorded balances, per account.",
    list_accounts: "Accounts with balances and stored terms.",
    get_budget_summary: "Monthly budget totals.",
    get_debt_overview: "Debts, APRs and minimum payments.",
    list_tax_records: "Tax records and totals for a tax year.",
    get_tax_year_position: "Income, allowances and tax estimates for a tax year.",
    simulate_debt_payoff: "Debt payoff timeline under a given strategy and extra payment.",
    project_net_worth: "Net worth projection at a given return, with optional events.",
    compare_mortgage_overpay_vs_invest:
      "Deprecated: overpaying a mortgage beside investing the same amount.",
    stage_import:
      "Stages the user's own accounts and month-end balances for them to review and commit in Flump. Never saves anything itself.",
    get_import_status: "Whether a staged import is waiting for review, committed or expired.",
  },
} as const;

export function registerSchemaResource(server: McpServer) {
  server.registerResource(
    "schema",
    SCHEMA_RESOURCE_URI,
    {
      title: "Flump data dictionary",
      description:
        "What Flump's data means: account categories, the sign convention for liabilities, monthly history and carry-forward, and tax-record categories. Contains no user data.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify(SCHEMA_DOCUMENT) },
      ],
    }),
  );
}
