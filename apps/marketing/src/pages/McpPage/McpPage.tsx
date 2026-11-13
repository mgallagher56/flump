import { Button } from "@repo/ui";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiCpu, FiEyeOff, FiLock, FiRefreshCw, FiShield, FiTerminal } from "react-icons/fi";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
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

const MCP_TOOLS: ToolCatalogEntry[] = [
  {
    name: "simulate_debt_payoff",
    description:
      "Compares Avalanche (highest APR) vs Snowball (lowest balance) payoff schedules. Flags Promotional expiry alerts and projects 5-year post-debt compounding.",
    samplePrompt: "Which debt should I clear first to save the most interest?",
  },
  {
    name: "simulate_uk_tax_and_pension_sacrifice",
    description:
      "Calculates net take-home pay, NI savings, £100k–£125k tax trap escape, and Gift Aid tax reclamations.",
    samplePrompt: "How much bonus should I sacrifice to reclaim my Personal Allowance?",
  },
  {
    name: "compare_mortgage_overpay_vs_isa",
    description:
      "Compares paying down a fixed mortgage vs investing in a Stocks and Shares ISA, factoring in LTV bracket unlocks (85%, 80%, 75%, 60%) before fix expiry.",
    samplePrompt: "Will overpaying £300/mo unlock a better mortgage rate tier next year?",
  },
  {
    name: "calculate_self_assessment_and_section24",
    description:
      "Calculates landlord Section 24 20% finance cost reducers and computes 31 January and 31 July Payments on Account (POA) reserves for Self Assessment.",
    samplePrompt: "What should my monthly tax pot reserve be for buy-to-let rent?",
  },
  {
    name: "project_wealth_scenario",
    description:
      "Runs 30-year multi-variable net worth projections with life events: BUY_HOME, HAVE_CHILD, REMORTGAGE_SHOCK, and EARLY_RETIRE_57.",
    samplePrompt: "Simulate my net worth if interest rates stay high for 5 years.",
  },
  {
    name: "evaluate_cashflow_runway_and_health",
    description:
      "Calculates your Emergency runway (in months), net cashflow margins, and a comprehensive 0–100 financial resilience score.",
    samplePrompt: "What is my Emergency runway if my income stops tomorrow?",
  },
  {
    name: "evaluate_uk_student_loan",
    description:
      "Simulates UK Student Loan (Plans 1, 2, 4, 5, and Postgraduate) write-off vs voluntary overpayment mathematics against ISA opportunity cost.",
    samplePrompt: "Will my Plan 2 student loan be written off before I repay it in full?",
  },
  {
    name: "query_transactions_and_spending",
    description:
      "Searches and aggregates sanitised spending categories, recurring direct debits, and priority vs flexible budget allocations.",
    samplePrompt: "Summarise my top recurring subscriptions and flexible spending this month.",
  },
];

export const McpPage: FC = () => {
  const appUrl = getAppUrl();

  return (
    <div className={pageShell()} id="mcp-marketing-page" data-testid="mcp-marketing-page">
      <PageMeta
        title="Flump for AI | Model Context Protocol (MCP) Server (Preview)"
        description="Preview: run the Flump Model Context Protocol (MCP) server from source and give AI agents deterministic UK financial calculations. Tools currently run against baseline sample data."
      />

      <Header />

      <main className={mainContent()}>
        {/* Hero Section */}
        <section className={heroSection()}>
          <div className={`${heroInner()} ${stack({ gap: "6", align: "center" })}`}>
            <span className={heroBadge()}>
              <FiCpu /> Model Context Protocol (MCP) server
            </span>
            <span className={previewBadge()} data-testid="mcp-preview-badge">
              Preview
            </span>

            <h1 className={heroHeading()}>
              Give your AI agent deterministic UK financial intelligence
            </h1>

            <p className={heroLead()}>
              Flump MCP is a preview for MCP clients such as Claude Desktop and Cursor. Its tools
              run tax-trap, debt avalanche and wealth projection simulations from a deterministic
              calculation engine. In preview they use <strong>baseline sample data</strong>, not
              your own figures.
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
            <h2 className={sectionHeading()}>Deterministic UK calculations and read-only tools</h2>
            <p className={sectionSubheading()}>
              General-purpose language models can get UK tax bands, NI tapering and amortisation
              maths wrong. Flump MCP tools calculate these with a deterministic engine instead.
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
                inputs always give the same tax, Section 24 and debt payoff results.
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
              <h3 className={cardTitle()}>Read-only guardrails</h3>
              <p className={cardBody()}>
                All Flump MCP tools carry <code>readOnlyHint: true</code> and{" "}
                <code>destructiveHint: false</code> metadata. Flump MCP tools have no payment
                feature.
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
              <h3 className={cardTitle()}>Token-bucket safety limits</h3>
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
                  In preview, the tools currently work against baseline sample data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog of Deterministic Tools */}
        <section className={sectionContainer()}>
          <div className={sectionHeader()}>
            <span className={sectionKicker()}>Tool catalogue</span>
            <h2 className={sectionHeading()}>8 deterministic financial tools for AI agents</h2>
            <p className={sectionSubheading()}>
              Your connected AI agent can invoke any of these read-only tools with custom
              parameters.
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
              Generate a read-only MCP token in your Flump profile. The preview tools use sample
              data.
            </p>
            <div className={flex({ gap: "4", justify: "center", flexWrap: "wrap", pt: "2" })}>
              <a href={`${appUrl}/app/profile`} className={linkReset()}>
                <Button size="lg" variant="primary">
                  Open your profile in the app →
                </Button>
              </a>
              <a href={`${appUrl}/signUp`} className={linkReset()}>
                <Button size="lg" variant="ghost">
                  Create an account
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
