import { Button } from "@repo/ui";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiCpu, FiEyeOff, FiLock, FiRefreshCw, FiShield, FiTerminal } from "react-icons/fi";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { signupCta } from "../../utils/site";
import { getAppUrl } from "../../utils/url";
import {
  cardBody,
  cardSamplePrompt,
  cardTitle,
  ctaInner,
  ctaSection,
  featureCard,
  heroBadge,
  heroHeading,
  heroInner,
  heroLead,
  heroSection,
  iconBadge,
  linkReset,
  mainContent,
  pageShell,
  previewBadge,
  sectionContainer,
  sectionHeader,
  sectionHeading,
  sectionKicker,
  sectionSubheading,
  setupContainer,
  setupPanel,
  setupSection,
  stepBlock,
  stepText,
  stepTitle,
  toolCodePill,
} from "./McpPage.styles";

interface ToolCatalogEntry {
  name: string;
  description: string;
  samplePrompt: string;
}

/** The tools Flump MCP serves today (after the E17 re-plan), read tools first. */
const MCP_TOOLS: ToolCatalogEntry[] = [
  {
    name: "get_financial_snapshot",
    description:
      "A one-call summary of your saved figures: net worth, cash, investments, pensions and debts, plus your monthly surplus and months of cover when you have a budget. Anything you have not recorded is reported as missing, never guessed.",
    samplePrompt: "Give me a summary of my finances from what I have saved in Flump.",
  },
  {
    name: "get_budget_summary",
    description:
      "Monthly totals from your budget entries: income, essential and discretionary spending, surplus and spending by category. Weekly and annual entries are converted to monthly.",
    samplePrompt: "How much do I spend each month on essentials, and what is left over?",
  },
  {
    name: "list_accounts",
    description:
      "Lists your saved accounts with a generic label, category and balance. Mortgages show the remaining term and fixed-rate end date when you have recorded them.",
    samplePrompt: "When does the fixed rate on my mortgage end?",
  },
  {
    name: "get_balance_history",
    description:
      "Month-end balances recorded in Flump between two months, per account, per category or as a net worth total, monthly, quarterly or yearly. Not yet available in the local preview.",
    samplePrompt: "How has my net worth changed over the last 12 months?",
  },
  {
    name: "get_data_coverage",
    description:
      "Shows which months have a recorded balance for each account, and where the gaps are. Not yet available in the local preview.",
    samplePrompt: "Which months are missing from my savings account history?",
  },
  {
    name: "get_debt_overview",
    description:
      "Your debts with balance, APR and minimum payment, plus overdraft, mortgage and student loan totals. An APR you have not recorded is reported as unknown, not guessed.",
    samplePrompt: "What do I owe in total, and what are the minimum payments each month?",
  },
  {
    name: "simulate_debt_payoff",
    description:
      "Simulates paying off your recorded debts under avalanche (highest APR first) and snowball (smallest balance first), with an optional extra monthly amount. Debts with no recorded APR are left out, not guessed.",
    samplePrompt: "What is the total interest under avalanche and under snowball for my debts?",
  },
  {
    name: "list_tax_records",
    description:
      "The income and expense records you keep for a UK tax year, with totals by source and a month-by-month or per-category breakdown.",
    samplePrompt: "What income have I recorded so far this tax year?",
  },
  {
    name: "get_tax_year_position",
    description:
      "Your UK tax position for a tax year from your saved salary and tax records: income by source, the income tax bands for your region, Class 4 National Insurance on self-employed profit, and where income sits against the Personal Allowance taper.",
    samplePrompt: "Which income tax band does my salary reach this tax year?",
  },
  {
    name: "project_net_worth",
    description:
      "Projects net worth year by year from your recorded balances, with and without up to 10 events that each carry a one-off or monthly cost you set. You choose the expected return.",
    samplePrompt:
      "How could my net worth change over 10 years at a 4% return if I start renting somewhere bigger?",
  },
];

export const McpPage: FC = () => {
  const appUrl = getAppUrl();
  const cta = signupCta();

  return (
    <div className={pageShell()} id="mcp-marketing-page" data-testid="mcp-marketing-page">
      <PageMeta
        title="Flump for AI | Model Context Protocol (MCP) Server (Preview)"
        description="Preview: connect an MCP client such as Claude Desktop to Flump and ask questions about your own saved finances. The tools read your saved data, with UK tax figures from a deterministic engine. Staging an import is being rolled out, is off by default, and saves nothing until you confirm it in Flump."
      />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        {/* Hero Section */}
        <section className={heroSection()}>
          <div className={`${heroInner()} ${stack({ gap: "6", align: "center" })}`}>
            <span className={heroBadge()}>
              <FiCpu /> Model Context Protocol (MCP) server
            </span>
            <span className={previewBadge()} data-testid="mcp-preview-badge">
              Preview
            </span>

            <h1 className={heroHeading()}>Ask your AI assistant about your own saved finances</h1>

            <p className={heroLead()}>
              Flump MCP is a preview for MCP clients such as Claude Desktop and Cursor. Its tools
              answer questions from the accounts, budget, debts and tax records you have saved in
              Flump, and UK tax and debt figures come from a deterministic calculation engine.
              Staging an import for you to review is being rolled out and is not on every account
              yet. Where it is available it is off by default, and nothing is saved until you
              confirm it in Flump.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center", pt: "2" })}>
              <a href={`${appUrl}/app/profile`} className={linkReset()}>
                <Button size="lg" variant="primary">
                  Open your profile in the app →
                </Button>
              </a>
              <a href="#setup-guides" className={linkReset()}>
                <Button size="lg" variant="outline">
                  View setup guides ↓
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Core Value Pillars / Architecture Principles */}
        <section className={sectionContainer()}>
          <div className={sectionHeader()}>
            <span className={sectionKicker()}>Why connect via Flump MCP?</span>
            <h2 className={sectionHeading()}>
              Deterministic UK calculations and tools that read your saved data
            </h2>
            <p className={sectionSubheading()}>
              General-purpose language models can get UK tax bands, the Personal Allowance taper and
              amortisation maths wrong. Flump MCP tools calculate these with a deterministic engine
              instead.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2, lg: 3 }, gap: "6" })}>
            {/* Pillar 1 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "primary" })}>
                <FiCpu />
              </div>
              <h3 className={cardTitle()}>Deterministic calculations</h3>
              <p className={cardBody()}>
                Tools run calculation functions from <code>@flump/finance-engine</code>, so the same
                inputs always give the same tax, debt payoff and net worth results.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "positive" })}>
                <FiShield />
              </div>
              <h3 className={cardTitle()}>Generic institution labels</h3>
              <p className={cardBody()}>
                Institution names are replaced with generic labels by default.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "warning" })}>
                <FiLock />
              </div>
              <h3 className={cardTitle()}>Staged imports need your confirmation</h3>
              <p className={cardBody()}>
                The tools that read your data carry <code>readOnlyHint: true</code>. A connection
                can stage an import only where staging is available and you switch it on, and
                staging saves nothing: you review and confirm the import in Flump. No Flump MCP tool
                deletes data. Flump MCP tools have no payment feature.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "info" })}>
                <FiTerminal />
              </div>
              <h3 className={cardTitle()}>Local CLI (preview)</h3>
              <p className={cardBody()}>
                Local CLI (preview): run Flump MCP from source. Setup guide coming soon.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "danger" })}>
                <FiRefreshCw />
              </div>
              <h3 className={cardTitle()}>Fixed-window safety limits</h3>
              <p className={cardBody()}>
                Enforces rate limits (60 tool calls/min, 300 calls/hr) per token to guard against
                runaway autonomous loops and unintended server spam.
              </p>
            </div>

            {/* Pillar 6 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "neutral" })}>
                <FiEyeOff />
              </div>
              <h3 className={cardTitle()}>1-click revocation &amp; expiry</h3>
              <p className={cardBody()}>
                Personal Access Tokens can expire (90 days is preselected when you create one) and
                can be revoked from your Flump profile. Each token records its total tool calls.
              </p>
            </div>
          </div>
        </section>

        {/* Step-by-Step Setup Guides */}
        <section id="setup-guides" className={setupSection()}>
          <div className={setupContainer()}>
            <div className={sectionHeader()}>
              <span className={sectionKicker()}>Preview</span>
              <h2 className={sectionHeading()}>Setting up Flump MCP (preview)</h2>
              <p className={sectionSubheading()}>
                Flump MCP is in preview and is not yet packaged for one-step installation.
              </p>
            </div>

            <div className={setupPanel()} id="setup-panel-local" data-testid="setup-panel-local">
              <div className={stepBlock()}>
                <h3 className={stepTitle()}>Local CLI (preview)</h3>
                <p className={stepText()}>
                  Local CLI (preview): run Flump MCP from source. Setup guide coming soon.
                </p>
                <p className={stepText()}>
                  The tools read the figures you have saved in Flump and cannot change them.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog of Deterministic Tools */}
        <section className={sectionContainer()}>
          <div className={sectionHeader()}>
            <span className={sectionKicker()}>Tool catalogue</span>
            <h2 className={sectionHeading()}>{MCP_TOOLS.length} tools that read your saved data</h2>
            <p className={sectionSubheading()}>
              Your connected AI assistant can call any of these tools. None of them can change your
              data.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2 }, gap: "6" })}>
            {MCP_TOOLS.map((tool) => (
              <div
                key={tool.name}
                className={featureCard()}
                id={`mcp-tool-${tool.name}`}
                data-testid={`mcp-tool-${tool.name}`}
              >
                <div className={flex({ align: "center", gap: "2" })}>
                  <code className={toolCodePill()}>{tool.name}</code>
                </div>
                <p className={cardBody()}>{tool.description}</p>
                <div className={cardSamplePrompt()}>
                  <em>Sample prompt:</em> "{tool.samplePrompt}"
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={ctaSection()}>
          <div className={ctaInner()}>
            <h2 className={sectionHeading()}>Try the MCP preview</h2>
            <p className={sectionSubheading()}>
              Generate an MCP token in your Flump profile. Its tools read your saved data. Where
              staging is available, you can also let it stage imports, and nothing is saved until
              you review and confirm them in Flump.
            </p>
            <div className={flex({ gap: "4", justify: "center", flexWrap: "wrap", pt: "2" })}>
              <a href={`${appUrl}/app/profile`} className={linkReset()}>
                <Button size="lg" variant="primary">
                  Open your profile in the app →
                </Button>
              </a>
              <a href={cta.href} className={linkReset()}>
                <Button size="lg" variant="ghost">
                  {cta.label}
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
