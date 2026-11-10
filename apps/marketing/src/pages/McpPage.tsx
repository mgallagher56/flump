import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
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
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { getAppUrl } from "../utils/url";

const containerStyle = css({
  maxWidth: "6xl",
  mx: "auto",
  py: "16",
  px: "4",
});

const heroBadgeStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 14px",
  borderRadius: "full",
  backgroundColor: "surface.tinted",
  color: "primary",
  fontSize: "xs",
  fontWeight: "700",
  letterSpacing: "0.03em",
  fontFamily: "mono",
  border: "1px solid",
  borderColor: "primary",
  mb: "4",
});

const featureCardStyle = css({
  backgroundColor: { base: "#ffffff", _dark: "dark.surface" },
  border: "1px solid",
  borderColor: { base: "slate.200", _dark: "slate.800" },
  borderRadius: "xl",
  padding: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  boxShadow: { base: "0 2px 8px rgba(0,0,0,0.03)", _dark: "0 2px 8px rgba(0,0,0,0.2)" },
  transition: "transform 0.15s ease, border-color 0.15s ease",
  _hover: {
    borderColor: "indigo.400",
    transform: "translateY(-2px)",
  },
});

const iconBadgeStyle = (bg = "rgba(99, 102, 241, 0.1)", color = "#6366f1") =>
  css({
    width: "40px",
    height: "40px",
    borderRadius: "lg",
    backgroundColor: bg,
    color,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
  });

const snippetBoxStyle = css({
  backgroundColor: "slate.950",
  color: "slate.200",
  fontFamily: "mono",
  fontSize: "xs",
  padding: "16px 20px",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "slate.800",
  overflowX: "auto",
  position: "relative",
  lineHeight: "1.6",
  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
});

const tabButtonStyle = (active: boolean) =>
  css({
    padding: "8px 18px",
    fontSize: "sm",
    fontWeight: "600",
    borderRadius: "lg",
    border: "1px solid",
    borderColor: active ? "primary" : "transparent",
    backgroundColor: active ? "surface.tinted" : "transparent",
    color: active ? "primary" : "text.secondary",
    cursor: "pointer",
    transition: "all 0.15s ease",
    _hover: {
      color: "primary",
    },
  });

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Helmet>
        <title>Flump for AI | Official Model Context Protocol (MCP) Server</title>
        <meta
          name="description"
          content="Connect Claude Desktop, Cursor, ChatGPT, and AI agents directly to your UK finances. Mathematical accuracy without hallucinations, strict PII privacy, and zero token costs."
        />
        <link rel="canonical" href="https://flump.co.uk/mcp" />
      </Helmet>

      <Header />

      <main style={{ flex: 1 }}>
        {/* Hero Section */}
        <section
          style={{
            position: "relative",
            padding: "80px 16px 64px",
            textAlign: "center",
            overflow: "hidden",
            backgroundColor: "var(--colors-background)",
            borderBottom: "1px solid var(--colors-border)",
          }}
        >
          {/* Radial ambient glow */}
          <div
            style={{
              position: "absolute",
              top: "-100px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "1000px",
              height: "480px",
              background:
                "radial-gradient(ellipse 60% 50% at 50% 10%, rgba(99, 102, 241, 0.18) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 75%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div
            style={{ maxWidth: "960px", margin: "0 auto", position: "relative", zIndex: 1 }}
            className={stack({ gap: "6", align: "center" })}
          >
            <span className={heroBadgeStyle}>
              <FiCpu /> Official Model Context Protocol (MCP) Server
            </span>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)",
                fontWeight: "900",
                lineHeight: "1.1",
                letterSpacing: "-0.04em",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                margin: 0,
              }}
            >
              Give your AI agent deterministic UK financial intelligence.
            </h1>

            <p
              style={{
                fontSize: "clamp(1.1rem, 2vw, 1.3rem)",
                color: "var(--colors-text-secondary)",
                maxWidth: "760px",
                lineHeight: "1.65",
                margin: 0,
              }}
            >
              Connect Claude Desktop, Cursor, ChatGPT, or autonomous agents directly to Flump. Run
              tax-trap escapes, debt avalanche simulations, and 30-year wealth projections with zero
              hallucinations—at <strong>zero LLM token cost to Flump</strong>.
            </p>

            <div className={flex({ gap: "4", flexWrap: "wrap", justify: "center", pt: "2" })}>
              <a href={`${appUrl}/profile`} style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="primary"
                  style={{
                    padding: "16px 36px",
                    fontSize: "1.0625rem",
                    fontWeight: "700",
                    borderRadius: "12px",
                    boxShadow: "0 10px 24px -4px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  Generate MCP Token in App →
                </Button>
              </a>
              <a href="#setup-guides" style={{ textDecoration: "none" }}>
                <Button
                  size="lg"
                  variant="outline"
                  style={{
                    padding: "16px 28px",
                    fontSize: "1.0625rem",
                    borderRadius: "12px",
                  }}
                >
                  View Setup Guides ↓
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Core Value Pillars / Architecture Guarantees */}
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.04em",
                color: "var(--colors-primary)",
                textTransform: "uppercase",
              }}
            >
              Why Connect via Flump MCP?
            </span>
            <h2
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                margin: "8px 0 16px 0",
              }}
            >
              Engineered for absolute accuracy and privacy
            </h2>
            <p
              style={{
                fontSize: "1.1rem",
                color: "var(--colors-text-secondary)",
                maxWidth: "680px",
                margin: "0 auto",
                lineHeight: "1.6",
              }}
            >
              Standard LLMs struggle with UK tax bands, NI tapering, and amortisation mathematics.
              Flump MCP replaces LLM guesswork with our deterministic UK financial engine.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2, lg: 3 }, gap: "6" })}>
            {/* Pillar 1 */}
            <div className={featureCardStyle}>
              <div className={iconBadgeStyle("rgba(99, 102, 241, 0.12)", "#6366f1")}>
                <FiCpu />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: "var(--colors-text-primary)",
                  margin: 0,
                }}
              >
                Zero AI Hallucinations
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--colors-text-secondary)",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                Tools execute mathematical functions from <code>@flump/finance-engine</code>. Your
                AI receives exact HMRC tax calculations, Section 24 relief, and debt payoff dates
                rather than inventing numbers.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className={featureCardStyle}>
              <div className={iconBadgeStyle("rgba(16, 185, 129, 0.12)", "#10b981")}>
                <FiShield />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: "var(--colors-text-primary)",
                  margin: 0,
                }}
              >
                Strict PII Anonymisation
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--colors-text-secondary)",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                User names, emails, and account numbers are strictly scrubbed by default. A 1-click
                privacy toggle transforms real institution names into generic labels (e.g. "Current
                Account #1").
              </p>
            </div>

            {/* Pillar 3 */}
            <div className={featureCardStyle}>
              <div className={iconBadgeStyle("rgba(245, 158, 11, 0.12)", "#f59e0b")}>
                <FiLock />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: "var(--colors-text-primary)",
                  margin: 0,
                }}
              >
                Read-Only Guardrails
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--colors-text-secondary)",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                All MCP tools and resources carry strict <code>readOnlyHint: true</code> and{" "}
                <code>destructiveHint: false</code> metadata. Connected agents can never move money,
                change credentials, or initiate payments.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className={featureCardStyle}>
              <div className={iconBadgeStyle("rgba(59, 130, 246, 0.12)", "#3b82f6")}>
                <FiTerminal />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: "var(--colors-text-primary)",
                  margin: 0,
                }}
              >
                Local STDIO & Remote HTTP
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--colors-text-secondary)",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                Run locally via <code>npx @flump/mcp</code> directly inside Claude Desktop or
                Cursor, or connect remotely over OAuth 2.1 via{" "}
                <code>https://mcp.flump.co.uk/mcp</code> for web agents.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className={featureCardStyle}>
              <div className={iconBadgeStyle("rgba(236, 72, 153, 0.12)", "#ec4899")}>
                <FiRefreshCw />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: "var(--colors-text-primary)",
                  margin: 0,
                }}
              >
                Token-Bucket Safety Limits
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--colors-text-secondary)",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                Enforces strict rate limits (60 tool calls/min, 300 calls/hr) per token to guard
                against runaway autonomous loops and unintended server spam.
              </p>
            </div>

            {/* Pillar 6 */}
            <div className={featureCardStyle}>
              <div className={iconBadgeStyle("rgba(139, 92, 246, 0.12)", "#8b5cf6")}>
                <FiEyeOff />
              </div>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "700",
                  color: "var(--colors-text-primary)",
                  margin: 0,
                }}
              >
                1-Click Revocation & Expiry
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--colors-text-secondary)",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                Personal Access Tokens default to 90 days and can be revoked instantly with one
                click from your Flump profile. Audit counters track total tool invocations per
                token.
              </p>
            </div>
          </div>
        </section>

        {/* Step-by-Step Setup Guides */}
        <section
          id="setup-guides"
          style={{
            padding: "80px 16px",
            backgroundColor: "var(--colors-surface-sunken, #f8fafc)",
            borderTop: "1px solid var(--colors-border)",
            borderBottom: "1px solid var(--colors-border)",
          }}
        >
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "36px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  letterSpacing: "0.04em",
                  color: "var(--colors-primary)",
                  textTransform: "uppercase",
                }}
              >
                Quick Integration
              </span>
              <h2
                style={{
                  fontSize: "2.25rem",
                  fontWeight: "800",
                  color: "var(--colors-text-primary)",
                  fontFamily: "var(--fonts-display)",
                  margin: "6px 0 12px 0",
                }}
              >
                How to set up Flump MCP in 2 minutes
              </h2>
              <p style={{ fontSize: "1.05rem", color: "var(--colors-text-secondary)", margin: 0 }}>
                Choose your AI environment below for copy-and-paste instructions.
              </p>
            </div>

            {/* Tab Selectors */}
            <div
              className={flex({
                gap: "2",
                justify: "center",
                mb: "6",
                flexWrap: "wrap",
              })}
            >
              <button
                type="button"
                className={tabButtonStyle(activeSetupTab === "desktop")}
                onClick={() => setActiveSetupTab("desktop")}
              >
                Claude Desktop
              </button>
              <button
                type="button"
                className={tabButtonStyle(activeSetupTab === "cursor")}
                onClick={() => setActiveSetupTab("cursor")}
              >
                Cursor AI
              </button>
              <button
                type="button"
                className={tabButtonStyle(activeSetupTab === "remote")}
                onClick={() => setActiveSetupTab("remote")}
              >
                Claude Web & ChatGPT
              </button>
            </div>

            {/* Tab 1: Claude Desktop */}
            {activeSetupTab === "desktop" && (
              <div
                style={{
                  backgroundColor: "var(--colors-surface-card, #ffffff)",
                  borderRadius: "16px",
                  border: "1px solid var(--colors-border)",
                  padding: "28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                    1. Generate your Personal Access Token
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                    Sign in to Flump and visit{" "}
                    <a
                      href={`${appUrl}/profile`}
                      style={{ color: "var(--colors-primary)", fontWeight: "600" }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Profile &gt; AI & MCP Access
                    </a>
                    . Click <strong>+ Generate New AI Connection Token</strong>.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                    2. Locate your Claude Desktop configuration file
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      fontSize: "13px",
                      fontFamily: "var(--fonts-mono)",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "var(--colors-surface-sunken, #f1f5f9)",
                        borderRadius: "8px",
                      }}
                    >
                      <strong>macOS:</strong>{" "}
                      <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "var(--colors-surface-sunken, #f1f5f9)",
                        borderRadius: "8px",
                      }}
                    >
                      <strong>Windows:</strong>{" "}
                      <code>%APPDATA%\Claude\claude_desktop_config.json</code>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                      3. Paste the configuration block
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleCopySnippet(claudeDesktopConfig)}
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        borderRadius: "6px",
                        backgroundColor: "var(--colors-primary)",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {copied ? <FiCheck /> : <FiFileText />}
                      {copied ? "Copied!" : "Copy Snippet"}
                    </button>
                  </div>
                  <pre className={snippetBoxStyle}>{claudeDesktopConfig}</pre>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                    4. Restart Claude Desktop and prompt
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                    Quit and reopen Claude Desktop. The hammer 🔨 icon in Claude will confirm
                    Flump's 8 financial simulation tools are available. Try asking:{" "}
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
                style={{
                  backgroundColor: "var(--colors-surface-card, #ffffff)",
                  borderRadius: "16px",
                  border: "1px solid var(--colors-border)",
                  padding: "28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                    1. Open Cursor MCP Settings
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                    Open Cursor and navigate to{" "}
                    <strong>Cursor Settings &gt; Features &gt; MCP</strong>. Click{" "}
                    <strong>+ Add New MCP Server</strong>.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                    2. Workspace configuration (<code>.cursor/mcp.json</code>)
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                    Alternatively, add this file directly to your project root under{" "}
                    <code>.cursor/mcp.json</code>:
                  </p>
                  <pre className={snippetBoxStyle}>{cursorMcpConfig}</pre>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                    3. Prompt in Cursor Composer
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                    In Cursor Chat or Composer, reference <code>@flump</code> or ask:{" "}
                    <em>
                      "Calculate my Self-Assessment Section 24 landlord liability using Flump."
                    </em>
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Remote MCP (Claude Web & ChatGPT) */}
            {activeSetupTab === "remote" && (
              <div
                style={{
                  backgroundColor: "var(--colors-surface-card, #ffffff)",
                  borderRadius: "16px",
                  border: "1px solid var(--colors-border)",
                  padding: "28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "700", margin: 0 }}>
                    Remote HTTP Transport (RFC 9728 & OAuth 2.1)
                  </h3>
                  <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                    Web AI agents (Claude.ai Web, Custom GPT Actions) connect remotely via HTTPS.
                    Flump hosts streamable MCP endpoints protected by RFC 8707 scoped audience
                    tokens.
                  </p>
                </div>

                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "var(--colors-surface-sunken, #f1f5f9)",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    fontSize: "13px",
                    fontFamily: "var(--fonts-mono)",
                  }}
                >
                  <div>
                    <strong>Remote Server URL:</strong> <code>https://mcp.flump.co.uk/mcp</code>
                  </div>
                  <div>
                    <strong>OAuth Protected Resource Metadata:</strong>{" "}
                    <code>https://mcp.flump.co.uk/.well-known/oauth-protected-resource</code>
                  </div>
                </div>

                <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                  Enter the Remote Server URL in your web agent. During OAuth setup, authenticate
                  using your Flump account to grant scoped, revocable access.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Catalog of Deterministic Tools */}
        <section className={containerStyle}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                letterSpacing: "0.04em",
                color: "var(--colors-primary)",
                textTransform: "uppercase",
              }}
            >
              Tool Catalog
            </span>
            <h2
              style={{
                fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
                fontWeight: "800",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                margin: "8px 0 16px 0",
              }}
            >
              8 Deterministic Financial Tools for AI Agents
            </h2>
            <p
              style={{
                fontSize: "1.05rem",
                color: "var(--colors-text-secondary)",
                maxWidth: "680px",
                margin: "0 auto",
                lineHeight: "1.6",
              }}
            >
              Your connected AI agent can invoke any of these tools with custom parameters.
            </p>
          </div>

          <div className={grid({ columns: { base: 1, md: 2 }, gap: "6" })}>
            <div className={featureCardStyle}>
              <div className={flex({ align: "center", gap: "2" })}>
                <code
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "var(--colors-primary)",
                    backgroundColor: "var(--colors-surface-tinted)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  simulate_debt_payoff
                </code>
              </div>
              <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                Compares Avalanche (highest APR) vs Snowball (lowest balance) payoff schedules.
                Flags impending 0% promo cliff expiry dates and projects 5-year post-debt
                compounding.
              </p>
              <div style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                <em>Sample prompt:</em> "Which debt should I clear first to save the most interest?"
              </div>
            </div>

            <div className={featureCardStyle}>
              <div className={flex({ align: "center", gap: "2" })}>
                <code
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "var(--colors-primary)",
                    backgroundColor: "var(--colors-surface-tinted)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  simulate_uk_tax_and_pension_sacrifice
                </code>
              </div>
              <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                Calculates net take-home pay, NI savings, £100k-£125k tax trap escape, and Gift Aid
                tax reclamations for the 2025/26 and 2026/27 tax years.
              </p>
              <div style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                <em>Sample prompt:</em> "How much bonus should I sacrifice to reclaim my personal
                allowance?"
              </div>
            </div>

            <div className={featureCardStyle}>
              <div className={flex({ align: "center", gap: "2" })}>
                <code
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "var(--colors-primary)",
                    backgroundColor: "var(--colors-surface-tinted)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  compare_mortgage_overpay_vs_isa
                </code>
              </div>
              <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                Compares paying down a fixed mortgage vs investing in a Stocks & Shares ISA,
                factoring in LTV bracket unlocks (85%, 80%, 75%, 60%) before fix expiry.
              </p>
              <div style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                <em>Sample prompt:</em> "Will overpaying £300/mo unlock a better mortgage rate tier
                next year?"
              </div>
            </div>

            <div className={featureCardStyle}>
              <div className={flex({ align: "center", gap: "2" })}>
                <code
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "var(--colors-primary)",
                    backgroundColor: "var(--colors-surface-tinted)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  calculate_self_assessment_and_section24
                </code>
              </div>
              <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                Calculates landlord Section 24 20% finance cost reducers and computes HMRC 31 Jan
                and 31 Jul Payments on Account (POA) reserves.
              </p>
              <div style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                <em>Sample prompt:</em> "What should my monthly HMRC tax pot reserve be for
                buy-to-let rent?"
              </div>
            </div>

            <div className={featureCardStyle}>
              <div className={flex({ align: "center", gap: "2" })}>
                <code
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "var(--colors-primary)",
                    backgroundColor: "var(--colors-surface-tinted)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  project_wealth_scenario
                </code>
              </div>
              <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                Runs 30-year multi-variable net worth projections with life events: BUY_HOME,
                HAVE_CHILD, REMORTGAGE_SHOCK, and EARLY_RETIRE_57.
              </p>
              <div style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                <em>Sample prompt:</em> "Simulate my net worth if interest rates stay high for 5
                years."
              </div>
            </div>

            <div className={featureCardStyle}>
              <div className={flex({ align: "center", gap: "2" })}>
                <code
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    color: "var(--colors-primary)",
                    backgroundColor: "var(--colors-surface-tinted)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}
                >
                  evaluate_cashflow_runway_and_health
                </code>
              </div>
              <p style={{ fontSize: "14px", color: "var(--colors-text-secondary)", margin: 0 }}>
                Calculates emergency fund survival runway (in months), net cashflow margins, and a
                comprehensive 0-100 financial resilience score.
              </p>
              <div style={{ fontSize: "12px", color: "var(--colors-text-muted)" }}>
                <em>Sample prompt:</em> "What is my emergency fund runway if my income stops
                tomorrow?"
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          style={{
            padding: "80px 16px",
            textAlign: "center",
            backgroundColor: "var(--colors-background)",
            borderTop: "1px solid var(--colors-border)",
          }}
        >
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "2.5rem",
                fontWeight: "800",
                color: "var(--colors-text-primary)",
                fontFamily: "var(--fonts-display)",
                margin: "0 0 14px 0",
              }}
            >
              Ready to connect your AI agent?
            </h2>
            <p
              style={{
                fontSize: "1.15rem",
                color: "var(--colors-text-secondary)",
                marginBottom: "32px",
                lineHeight: "1.6",
              }}
            >
              Generate your free read-only MCP token in seconds. No credit card required.
            </p>
            <div className={flex({ gap: "4", justify: "center", flexWrap: "wrap" })}>
              <a href={`${appUrl}/profile`} style={{ textDecoration: "none" }}>
                <Button size="lg" variant="primary">
                  Generate Your Token in Flump →
                </Button>
              </a>
              <a href={`${appUrl}/signUp`} style={{ textDecoration: "none" }}>
                <Button size="lg" variant="ghost">
                  Create a Free Account
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
