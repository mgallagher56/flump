import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServerContext } from "../types.js";

export function registerUkAdvisorPrompts(
  server: McpServer,
  getContext: () => Promise<McpServerContext>,
) {
  // 1. uk-financial-health-audit
  server.registerPrompt(
    "uk-financial-health-audit",
    {
      title: "UK financial health audit",
      description:
        "Comprehensive UK personal financial health audit, evaluating net worth, emergency runway, high-APR debt burn, and tax efficiency.",
    },
    async () => {
      const ctx = await getContext();
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId, {
        anonymizeInstitutions: ctx.token.anonymizeInstitutions,
      });

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please conduct a comprehensive financial health audit of my Flump UK financial profile.
1. Read my current snapshot via flump://context/executive-snapshot and flump://context/budget.
2. Evaluate my Financial Stage and identify any urgent interest burn or cash flow vulnerabilities.
3. Recommend the top 3 highest-impact mathematical actions to accelerate my net worth or protect my lifestyle runway.`,
            },
          },
        ],
      };
    },
  );

  // 2. escape-100k-tax-trap
  server.registerPrompt(
    "escape-100k-tax-trap",
    {
      title: "Escape the 100k tax trap",
      description:
        "Analyzes whether gross salary + bonuses enter the UK £100k-£125,140 60% (or 69.5% Scottish) tax trap and models optimal pension sacrifice.",
    },
    async () => {
      const ctx = await getContext();
      const rawData = await ctx.dataProvider.getUserFinancialData(ctx.token.userId);
      const b = rawData.baseline;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `My current UK gross salary is £${b.annualGrossSalary.toLocaleString("en-GB")}.
Please call the tool 'simulate_uk_tax_and_pension_sacrifice' to calculate whether I am in the £100k tax trap, how much Personal Allowance I have lost, and what exact pension contribution or Gift Aid donation is required to escape the 60% effective tax rate and maximize take-home wealth.`,
            },
          },
        ],
      };
    },
  );

  // 3. crush-high-apr-debt
  server.registerPrompt(
    "crush-high-apr-debt",
    {
      title: "Crush high APR debt",
      description:
        "Inspects all credit cards, 0% promotional balance transfers, and arranged overdrafts, generating an aggressive Avalanche vs Snowball payoff plan.",
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please inspect my current credit accounts and liabilities via flump://context/accounts.
Call 'simulate_debt_payoff' with strategy='COMPARE_BOTH' and £100/mo extra overpayment.
Identify any 0% promotional balance transfer cliffs expiring soon, calculate overdraft interest burn, and outline the fastest path to becoming debt-free.`,
            },
          },
        ],
      };
    },
  );
}
