import { Button } from "@repo/ui";
import { flex, grid, stack } from "@repo/ui/styled-system/patterns";
import type { FC } from "react";
import { FiCheckCircle, FiCpu, FiShield, FiTerminal } from "react-icons/fi";
import { Link } from "react-router-dom";
import { getAppUrl } from "../../utils/url";
import {
  bulletIcon,
  bulletRow,
  linkReset,
  payloadBool,
  payloadBracket,
  payloadComment,
  payloadKey,
  payloadNum,
  spotlightBadge,
  spotlightColumn,
  spotlightContainer,
  spotlightHeading,
  spotlightLead,
  spotlightSection,
  terminalCard,
  terminalDot,
  terminalHeader,
  terminalPayloadBox,
  terminalPromptLine,
  terminalSummary,
  terminalSummaryStrong,
  terminalTitle,
  terminalToolLine,
} from "./McpSpotlightSection.styles";

export const McpSpotlightSection: FC = () => {
  const appUrl = getAppUrl();

  return (
    <section
      className={spotlightSection()}
      id="mcp-spotlight-section"
      data-testid="mcp-spotlight-section"
    >
      <div className={spotlightContainer()}>
        <div
          className={grid({
            columns: { base: 1, lg: 12 },
            gap: "10",
            alignItems: "center",
          })}
        >
          {/* Left Column: Copy & Value Proposition */}
          <div className={`${spotlightColumn()} ${stack({ gap: "6" })}`}>
            <div>
              <span className={spotlightBadge()}>
                <FiCpu /> Official Model Context Protocol (MCP) server
              </span>
            </div>

            <h2 className={spotlightHeading()}>
              Connect Claude &amp; Cursor directly to your UK finances
            </h2>

            <p className={spotlightLead()}>
              Stop copy-pasting numbers into ChatGPT. Flump's MCP server exposes 8 deterministic
              financial simulation tools and 6 PII-scrubbed resources directly to Claude Desktop,
              Cursor, and autonomous agents – guaranteeing <strong>zero hallucinations</strong> on
              UK tax rules.
            </p>

            <div className={stack({ gap: "3" })}>
              <div className={bulletRow()}>
                <FiCheckCircle className={bulletIcon({ tone: "positive" })} size={18} />
                <span>
                  <strong>Deterministic HMRC engine:</strong> Exact 2025/26 tax bands, £100k taper,
                  and Section 24 relief.
                </span>
              </div>
              <div className={bulletRow()}>
                <FiShield className={bulletIcon({ tone: "primary" })} size={18} />
                <span>
                  <strong>Strict PII anonymisation:</strong> Names and account numbers are
                  completely stripped with optional bank masking.
                </span>
              </div>
              <div className={bulletRow()}>
                <FiTerminal className={bulletIcon({ tone: "info" })} size={18} />
                <span>
                  <strong>Zero-config local CLI:</strong> Runs via <code>npx @flump/mcp</code> with
                  zero LLM token costs to Flump.
                </span>
              </div>
            </div>

            <div className={flex({ gap: "4", flexWrap: "wrap", pt: "2" })}>
              <Link to="/mcp" className={linkReset()}>
                <Button size="md" variant="primary">
                  Explore MCP &amp; setup guides →
                </Button>
              </Link>
              <a href={`${appUrl}/app/profile`} className={linkReset()}>
                <Button size="md" variant="outline">
                  Generate token in app
                </Button>
              </a>
            </div>
          </div>

          {/* Right Column: Code & Agent Prompt Visualiser */}
          <div className={spotlightColumn()}>
            <div className={terminalCard()}>
              <div className={terminalHeader()}>
                <div className={terminalDot({ tone: "danger" })} />
                <div className={terminalDot({ tone: "warning" })} />
                <div className={terminalDot({ tone: "positive" })} />
                <span className={terminalTitle()}>Claude Desktop • Prompting @flump MCP</span>
              </div>

              <div className={terminalPromptLine()}>
                &gt; "Can I escape the £100k tax trap this year with salary sacrifice?"
              </div>

              <div className={terminalToolLine()}>
                ⚡ Calling tool: <code>simulate_uk_tax_and_pension_sacrifice</code>
              </div>

              <div className={terminalPayloadBox()}>
                <span className={payloadComment()}>
                  {"// Deterministic response from @flump/finance-engine"}
                </span>
                <br />
                <span className={payloadBracket()}>{"{"}</span>
                <br />
                &nbsp;&nbsp;<span className={payloadKey()}>"escapedTaxTrap":</span>{" "}
                <span className={payloadBool()}>true</span>,
                <br />
                &nbsp;&nbsp;
                <span className={payloadKey()}>"personalAllowanceReclaimedGbp":</span>{" "}
                <span className={payloadNum()}>7100</span>,
                <br />
                &nbsp;&nbsp;
                <span className={payloadKey()}>"effectivePersonalAllowanceGbp":</span>{" "}
                <span className={payloadNum()}>12570</span>,
                <br />
                &nbsp;&nbsp;<span className={payloadKey()}>"taxAndNiSavedGbp":</span>{" "}
                <span className={payloadNum()}>8804</span>,
                <br />
                &nbsp;&nbsp;<span className={payloadKey()}>"effectiveTaxReliefPct":</span>{" "}
                <span className={payloadNum()}>62.0</span>,
                <br />
                &nbsp;&nbsp;<span className={payloadKey()}>"optimalSacrificeGbp":</span>{" "}
                <span className={payloadNum()}>14200</span>
                <br />
                <span className={payloadBracket()}>{"}"}</span>
              </div>

              <div className={terminalSummary()}>
                <strong className={terminalSummaryStrong()}>Claude:</strong> Based on your Flump
                baseline (£114,200 gross), sacrificing £14,200 into your pension reclaims £7,100 of
                tapered Personal Allowance (restoring your full £12,570 allowance), saving you
                £8,804 in Income Tax and NI at an effective 62% marginal relief rate.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
