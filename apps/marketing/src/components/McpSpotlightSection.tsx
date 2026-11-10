import { Button } from "@repo/ui";
import { css } from "@repo/ui/styled-system/css";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiCheckCircle, FiCpu, FiShield, FiTerminal } from "react-icons/fi";
import { Link } from "react-router-dom";
import { getAppUrl } from "../utils/url";

const sectionStyle = css({
  padding: "80px 16px",
  backgroundColor: "slate.950",
  color: "slate.100",
  position: "relative",
  overflow: "hidden",
  borderTop: "1px solid",
  borderBottom: "1px solid",
  borderColor: "slate.800",
});

const pillStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "6px 14px",
  borderRadius: "full",
  backgroundColor: "rgba(99, 102, 241, 0.15)",
  color: "#a5b4fc",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.03em",
  fontFamily: "mono",
  border: "1px solid",
  borderColor: "indigo.500",
});

const snippetPreviewStyle = css({
  backgroundColor: "#090d16",
  border: "1px solid #1e293b",
  borderRadius: "16px",
  padding: "20px",
  fontFamily: "mono",
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#94a3b8",
  boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7)",
  overflowX: "auto",
});

export const McpSpotlightSection: FC = () => {
  const appUrl = getAppUrl();

  return (
    <section className={sectionStyle} data-testid="mcp-spotlight-section">
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          className={grid({
            columns: { base: 1, lg: 12 },
            gap: "10",
            alignItems: "center",
          })}
        >
          {/* Left Column: Copy & Value Proposition */}
          <div
            className={`${css({ gridColumn: { base: "span 1", lg: "span 6" } })} ${stack({ gap: "6" })}`}
          >
            <div>
              <span className={pillStyle}>
                <FiCpu /> Official Model Context Protocol (MCP) Server
              </span>
            </div>

            <h2
              style={{
                fontSize: "clamp(2rem, 3.8vw, 2.85rem)",
                fontWeight: "800",
                lineHeight: "1.15",
                letterSpacing: "-0.03em",
                color: "#ffffff",
                fontFamily: "var(--fonts-display)",
                margin: 0,
              }}
            >
              Connect Claude & Cursor directly to your UK finances.
            </h2>

            <p
              style={{
                fontSize: "1.0625rem",
                color: "#94a3b8",
                lineHeight: "1.65",
                margin: 0,
              }}
            >
              Stop copy-pasting numbers into ChatGPT. Flump's MCP server exposes 8 deterministic
              financial simulation tools and 6 PII-scrubbed resources directly to Claude Desktop,
              Cursor, and autonomous agents—guaranteeing <strong>zero hallucinations</strong> on UK
              tax rules.
            </p>

            <div className={stack({ gap: "3" })}>
              <div className={flex({ align: "center", gap: "3" })}>
                <FiCheckCircle style={{ color: "#10b981", flexShrink: 0 }} size={18} />
                <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
                  <strong>Deterministic HMRC Engine:</strong> Exact 2025/26 tax bands, £100k taper,
                  and Section 24 relief.
                </span>
              </div>
              <div className={flex({ align: "center", gap: "3" })}>
                <FiShield style={{ color: "#6366f1", flexShrink: 0 }} size={18} />
                <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
                  <strong>Strict PII Protection:</strong> Names and account numbers are completely
                  stripped with optional bank masking.
                </span>
              </div>
              <div className={flex({ align: "center", gap: "3" })}>
                <FiTerminal style={{ color: "#38bdf8", flexShrink: 0 }} size={18} />
                <span style={{ fontSize: "14px", color: "#cbd5e1" }}>
                  <strong>Zero-Config Local CLI:</strong> Runs via <code>npx @flump/mcp</code> with
                  zero LLM token costs to Flump.
                </span>
              </div>
            </div>

            <div className={flex({ gap: "4", flexWrap: "wrap", pt: "2" })}>
              <Link to="/mcp" style={{ textDecoration: "none" }}>
                <Button size="md" variant="primary">
                  Explore MCP & Setup Guides →
                </Button>
              </Link>
              <a href={`${appUrl}/profile`} style={{ textDecoration: "none" }}>
                <Button
                  size="md"
                  variant="outline"
                  style={{
                    color: "#ffffff",
                    borderColor: "#334155",
                  }}
                >
                  Generate Token in App
                </Button>
              </a>
            </div>
          </div>

          {/* Right Column: Code & Agent Prompt Visualizer */}
          <div className={css({ gridColumn: { base: "span 1", lg: "span 6" } })}>
            <div className={snippetPreviewStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "14px",
                  paddingBottom: "10px",
                  borderBottom: "1px solid #1e293b",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                  }}
                />
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#f59e0b",
                  }}
                />
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                  }}
                />
                <span style={{ marginLeft: "10px", fontSize: "11px", color: "#64748b" }}>
                  Claude Desktop • Prompting @flump MCP
                </span>
              </div>

              <div style={{ color: "#38bdf8", marginBottom: "8px" }}>
                &gt; "Can I escape the £100k tax trap this year with salary sacrifice?"
              </div>

              <div style={{ color: "#a5b4fc", marginBottom: "8px" }}>
                ⚡ Calling Tool: <code>simulate_uk_tax_and_pension_sacrifice</code>
              </div>

              <div
                style={{
                  backgroundColor: "#0f172a",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "12px",
                }}
              >
                <span style={{ color: "#64748b" }}>{"// Response from @flump/finance-engine"}</span>
                <br />
                <span style={{ color: "#e2e8f0" }}>{"{"}</span>
                <br />
                &nbsp;&nbsp;<span style={{ color: "#93c5fd" }}>"escapedTaxTrap":</span>{" "}
                <span style={{ color: "#4ade80" }}>true</span>,
                <br />
                &nbsp;&nbsp;
                <span style={{ color: "#93c5fd" }}>"personalAllowanceReclaimedGbp":</span>{" "}
                <span style={{ color: "#facc15" }}>12570</span>,
                <br />
                &nbsp;&nbsp;<span style={{ color: "#93c5fd" }}>"effectiveTaxReliefPct":</span>{" "}
                <span style={{ color: "#facc15" }}>62.0</span>,
                <br />
                &nbsp;&nbsp;<span style={{ color: "#93c5fd" }}>"optimalSacrificeGbp":</span>{" "}
                <span style={{ color: "#facc15" }}>14200</span>
                <br />
                <span style={{ color: "#e2e8f0" }}>{"}"}</span>
              </div>

              <div style={{ color: "#94a3b8", fontSize: "11.5px", lineHeight: "1.5" }}>
                <strong style={{ color: "#f8fafc" }}>Claude:</strong> Based on your Flump baseline,
                sacrificing £14,200 of your upcoming bonus reclaims 100% of your Personal Allowance,
                saving you £8,804 in Income Tax and NI at an effective 62% marginal relief rate.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
