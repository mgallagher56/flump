import { Button } from "@repo/ui";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import { type FC, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  FiCheck,
  FiCpu,
  FiEyeOff,
  FiFileText,
  FiLock,
  FiRefreshCw,
  FiShield,
  FiTerminal,
} from "react-icons/fi";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { getAppUrl } from "../../utils/url";
import {
  cardBody,
  cardSamplePrompt,
  cardTitle,
  copyButton,
  ctaInner,
  ctaSection,
  featureCard,
  heroBadge,
  heroHeading,
  heroInner,
  heroLead,
  heroSection,
  iconBadge,
  inlinePrimaryLink,
  linkReset,
  mainContent,
  pageShell,
  pathItem,
  pathList,
  sectionContainer,
  sectionHeader,
  sectionHeading,
  sectionKicker,
  sectionSubheading,
  setupContainer,
  setupPanel,
  setupSection,
  snippetBox,
  stepBlock,
  stepText,
  stepTitle,
  tabButton,
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
      "Calculates net take-home pay, NI savings, £100k–£125k tax trap escape, and Gift Aid tax reclamations for the 2025/26 and 2026/27 tax years.",
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
      "Calculates landlord Section 24 20% finance cost reducers and computes HMRC 31 Jan and 31 Jul Payments on Account (POA) reserves for Self Assessment.",
    samplePrompt: "What should my monthly HMRC tax pot reserve be for buy-to-let rent?",
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
  const [activeSetupTab, setActiveSetupTab] = useState<"desktop" | "cursor" | "remote">("desktop");
  const [copied, setCopied] = useState(false);
  const appUrl = getAppUrl();

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        flump: {
          command: "npx",
          args: ["-y", "@flump/mcp"],
          env: {
            FLUMP_PAT: "flump_pat_YOUR_TOKEN_HERE",
            FLUMP_API_URL: "https://mcp.flump.co.uk",
          },
        },
      },
    },
    null,
    2,
  );

  const cursorMcpConfig = JSON.stringify(
    {
      mcpServers: {
        flump: {
          command: "npx",
          args: ["-y", "@flump/mcp"],
          env: {
            FLUMP_PAT: "flump_pat_YOUR_TOKEN_HERE",
            FLUMP_API_URL: "https://mcp.flump.co.uk",
          },
        },
      },
    },
    null,
    2,
  );

  const handleCopySnippet = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={pageShell()} id="mcp-marketing-page" data-testid="mcp-marketing-page">
      <Helmet>
        <title>Flump for AI | Official Model Context Protocol (MCP) Server</title>
        <meta
          name="description"
          content="Connect Claude Desktop, Cursor, ChatGPT, and AI agents directly to your UK finances. Mathematical accuracy without hallucinations, strict PII privacy, and zero token costs."
        />
        <link rel="canonical" href="https://flump.co.uk/mcp" />
      </Helmet>

      <Header />

      <main className={mainContent()}>
        {/* Hero Section */}
        <section className={heroSection()}>
          <div className={`${heroInner()} ${stack({ gap: "6", align: "center" })}`}>
            <span className={heroBadge()}>
              <FiCpu /> Official Model Context Protocol (MCP) server
            </span>

            <h1 className={heroHeading()}>
              Give your AI agent deterministic UK financial intelligence
            </h1>

            <p className={heroLead()}>
              Connect Claude Desktop, Cursor, ChatGPT, or autonomous agents directly to Flump. Run
              tax-trap escapes, debt avalanche simulations, and 30-year wealth projections with zero
              hallucinations – at <strong>zero LLM token cost to Flump</strong>.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center", pt: "2" })}>
              <a href={`${appUrl}/app/profile`} className={linkReset()}>
                <Button size="lg" variant="primary">
                  Generate MCP token in app →
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

        {/* Core Value Pillars / Architecture Guarantees */}
        <section className={sectionContainer()}>
          <div className={sectionHeader()}>
            <span className={sectionKicker()}>Why connect via Flump MCP?</span>
            <h2 className={sectionHeading()}>Deterministic UK calculations and strict privacy</h2>
            <p className={sectionSubheading()}>
              Standard LLMs struggle with UK tax bands, NI tapering, and amortisation mathematics.
              Flump MCP replaces LLM guesswork with our deterministic UK financial engine.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2, lg: 3 }, gap: "6" })}>
            {/* Pillar 1 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "primary" })}>
                <FiCpu />
              </div>
              <h3 className={cardTitle()}>Zero AI hallucinations</h3>
              <p className={cardBody()}>
                Tools execute mathematical functions from <code>@flump/finance-engine</code>. Your
                AI receives exact HMRC tax calculations, Section 24 relief, and debt payoff dates
                rather than inventing numbers.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "positive" })}>
                <FiShield />
              </div>
              <h3 className={cardTitle()}>Strict PII anonymisation</h3>
              <p className={cardBody()}>
                User names, emails, and account numbers are strictly scrubbed by default. A 1-click
                privacy toggle transforms real institution names into generic labels (e.g. "Current
                Account #1").
              </p>
            </div>

            {/* Pillar 3 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "warning" })}>
                <FiLock />
              </div>
              <h3 className={cardTitle()}>Read-only guardrails</h3>
              <p className={cardBody()}>
                All MCP tools and resources carry strict <code>readOnlyHint: true</code> and{" "}
                <code>destructiveHint: false</code> metadata. Connected agents can never move money,
                change credentials, or initiate payments.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "info" })}>
                <FiTerminal />
              </div>
              <h3 className={cardTitle()}>Local STDIO &amp; remote HTTP</h3>
              <p className={cardBody()}>
                Run locally via <code>npx @flump/mcp</code> directly inside Claude Desktop or
                Cursor, or connect remotely over OAuth 2.1 via{" "}
                <code>https://mcp.flump.co.uk/mcp</code> for web agents.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "danger" })}>
                <FiRefreshCw />
              </div>
              <h3 className={cardTitle()}>Token-bucket safety limits</h3>
              <p className={cardBody()}>
                Enforces strict rate limits (60 tool calls/min, 300 calls/hr) per token to guard
                against runaway autonomous loops and unintended server spam.
              </p>
            </div>

            {/* Pillar 6 */}
            <div className={featureCard()}>
              <div className={iconBadge({ tone: "neutral" })}>
                <FiEyeOff />
              </div>
              <h3 className={cardTitle()}>1-click revocation &amp; expiry</h3>
              <p className={cardBody()}>
                Personal Access Tokens default to 90 days and can be revoked immediately with one
                click from your Flump profile. Audit counters track total tool invocations per
                token.
              </p>
            </div>
          </div>
        </section>

        {/* Step-by-Step Setup Guides */}
        <section id="setup-guides" className={setupSection()}>
          <div className={setupContainer()}>
            <div className={sectionHeader()}>
              <span className={sectionKicker()}>Quick integration</span>
              <h2 className={sectionHeading()}>How to set up Flump MCP in 2 minutes</h2>
              <p className={sectionSubheading()}>
                Choose your AI environment below for copy-and-paste instructions.
              </p>
            </div>

            {/* Tab Selectors */}
            <div
              role="tablist"
              aria-label="MCP client setup guides"
              className={flex({
                gap: "2",
                justify: "center",
                mb: "6",
                flexWrap: "wrap",
              })}
            >
              <button
                type="button"
                role="tab"
                id="setup-tab-desktop"
                data-testid="setup-tab-desktop"
                aria-selected={activeSetupTab === "desktop"}
                className={tabButton({ active: activeSetupTab === "desktop" })}
                onClick={() => setActiveSetupTab("desktop")}
              >
                Claude Desktop
              </button>
              <button
                type="button"
                role="tab"
                id="setup-tab-cursor"
                data-testid="setup-tab-cursor"
                aria-selected={activeSetupTab === "cursor"}
                className={tabButton({ active: activeSetupTab === "cursor" })}
                onClick={() => setActiveSetupTab("cursor")}
              >
                Cursor AI
              </button>
              <button
                type="button"
                role="tab"
                id="setup-tab-remote"
                data-testid="setup-tab-remote"
                aria-selected={activeSetupTab === "remote"}
                className={tabButton({ active: activeSetupTab === "remote" })}
                onClick={() => setActiveSetupTab("remote")}
              >
                Claude Web &amp; ChatGPT
              </button>
            </div>

            {/* Tab 1: Claude Desktop */}
            {activeSetupTab === "desktop" && (
              <div
                className={setupPanel()}
                id="setup-panel-desktop"
                data-testid="setup-panel-desktop"
              >
                <div className={stepBlock()}>
                  <h3 className={stepTitle()}>1. Generate your Personal Access Token</h3>
                  <p className={stepText()}>
                    Sign in to Flump and visit{" "}
                    <a
                      href={`${appUrl}/app/profile`}
                      className={inlinePrimaryLink()}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Profile &gt; AI &amp; MCP Access
                    </a>
                    . Click <strong>+ Generate New AI Connection Token</strong>.
                  </p>
                </div>

                <div className={stepBlock()}>
                  <h3 className={stepTitle()}>2. Locate your Claude Desktop configuration file</h3>
                  <div className={pathList()}>
                    <div className={pathItem()}>
                      <strong>macOS:</strong>{" "}
                      <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
                    </div>
                    <div className={pathItem()}>
                      <strong>Windows:</strong>{" "}
                      <code>%APPDATA%\Claude\claude_desktop_config.json</code>
                    </div>
                  </div>
                </div>

                <div className={stepBlock()}>
                  <div className={flex({ justify: "space-between", align: "center", gap: "2" })}>
                    <h3 className={stepTitle()}>3. Paste the configuration block</h3>
                    <button
                      type="button"
                      id="copy-claude-snippet-btn"
                      data-testid="copy-claude-snippet-btn"
                      onClick={() => handleCopySnippet(claudeDesktopConfig)}
                      className={copyButton()}
                    >
                      {copied ? <FiCheck /> : <FiFileText />}
                      {copied ? "Copied" : "Copy snippet"}
                    </button>
                  </div>
                  <pre className={snippetBox()}>{claudeDesktopConfig}</pre>
                </div>

                <div className={stepBlock()}>
                  <h3 className={stepTitle()}>4. Restart Claude Desktop and prompt</h3>
                  <p className={stepText()}>
                    Quit and reopen Claude Desktop. The tools icon in Claude will confirm Flump's 8
                    financial simulation tools are available. Try asking:{" "}
                    <em>
                      "Run a financial audit on my Flump baseline and check if I'm in the 60% tax
                      trap."
                    </em>
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Cursor AI */}
            {activeSetupTab === "cursor" && (
              <div
                className={setupPanel()}
                id="setup-panel-cursor"
                data-testid="setup-panel-cursor"
              >
                <div className={stepBlock()}>
                  <h3 className={stepTitle()}>1. Open Cursor MCP settings</h3>
                  <p className={stepText()}>
                    Open Cursor and navigate to{" "}
                    <strong>Cursor Settings &gt; Features &gt; MCP</strong>. Click{" "}
                    <strong>+ Add New MCP Server</strong>.
                  </p>
                </div>

                <div className={stepBlock()}>
                  <h3 className={stepTitle()}>
                    2. Workspace configuration (<code>.cursor/mcp.json</code>)
                  </h3>
                  <p className={stepText()}>
                    Alternatively, add this file directly to your project root under{" "}
                    <code>.cursor/mcp.json</code>:
                  </p>
                  <pre className={snippetBox()}>{cursorMcpConfig}</pre>
                </div>

                <div className={stepBlock()}>
                  <h3 className={stepTitle()}>3. Prompt in Cursor Composer</h3>
                  <p className={stepText()}>
                    In Cursor Chat or Composer, reference <code>@flump</code> or ask:{" "}
                    <em>
                      "Calculate my Self Assessment Section 24 landlord liability using Flump."
                    </em>
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Remote MCP (Claude Web & ChatGPT) */}
            {activeSetupTab === "remote" && (
              <div
                className={setupPanel()}
                id="setup-panel-remote"
                data-testid="setup-panel-remote"
              >
                <div className={stepBlock()}>
                  <h3 className={stepTitle()}>Remote HTTP transport (RFC 9728 &amp; OAuth 2.1)</h3>
                  <p className={stepText()}>
                    Web AI agents (Claude.ai Web, Custom GPT Actions) connect remotely via HTTPS.
                    Flump hosts streamable MCP endpoints protected by RFC 8707 scoped audience
                    tokens.
                  </p>
                </div>

                <div className={pathList()}>
                  <div className={pathItem()}>
                    <strong>Remote server URL:</strong> <code>https://mcp.flump.co.uk/mcp</code>
                  </div>
                  <div className={pathItem()}>
                    <strong>OAuth protected resource metadata:</strong>{" "}
                    <code>https://mcp.flump.co.uk/.well-known/oauth-protected-resource</code>
                  </div>
                </div>

                <p className={stepText()}>
                  Enter the Remote server URL in your web agent. During OAuth setup, authorise your
                  Flump account to grant scoped, revocable access.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Catalog of Deterministic Tools */}
        <section className={sectionContainer()}>
          <div className={sectionHeader()}>
            <span className={sectionKicker()}>Tool catalogue</span>
            <h2 className={sectionHeading()}>8 deterministic financial tools for AI agents</h2>
            <p className={sectionSubheading()}>
              Your connected AI agent can invoke any of these read-only tools with custom
              parameters, backed by 6 baseline context resources and 3 starter prompts.
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
            <h2 className={sectionHeading()}>Ready to connect your AI agent?</h2>
            <p className={sectionSubheading()}>
              Generate your free read-only MCP token in seconds. No credit card required.
            </p>
            <div className={flex({ gap: "4", justify: "center", flexWrap: "wrap", pt: "2" })}>
              <a href={`${appUrl}/app/profile`} className={linkReset()}>
                <Button size="lg" variant="primary">
                  Generate your token in Flump →
                </Button>
              </a>
              <a href={`${appUrl}/signUp`} className={linkReset()}>
                <Button size="lg" variant="ghost">
                  Create a free account
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
