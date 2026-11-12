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
  previewBadge,
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
                <FiCpu /> Model Context Protocol (MCP) server
              </span>{" "}
              <span className={previewBadge()} data-testid="mcp-spotlight-preview-badge">
                Preview
              </span>
            </div>

            <h2 className={spotlightHeading()}>
              Give Claude and Cursor deterministic UK tax and finance tools
            </h2>

            <p className={spotlightLead()}>
              Flump's MCP server exposes 8 deterministic financial simulation tools to MCP clients
              such as Claude Desktop and Cursor. In preview they run against{" "}
              <strong>baseline sample data</strong>.
            </p>

            <div className={stack({ gap: "3" })}>
              <div className={bulletRow()}>
                <FiCheckCircle className={bulletIcon({ tone: "positive" })} size={18} />
                <span>
                  <strong>Deterministic engine:</strong> UK tax bands, £100k taper, and Section 24
                  relief.
                </span>
              </div>
              <div className={bulletRow()}>
                <FiShield className={bulletIcon({ tone: "primary" })} size={18} />
                <span>
                  <strong>Generic labels:</strong> Institution names are replaced with generic
                  labels by default.
                </span>
              </div>
              <div className={bulletRow()}>
                <FiTerminal className={bulletIcon({ tone: "info" })} size={18} />
                <span>
                  <strong>Local CLI (preview):</strong> Run Flump MCP from source. Setup guide
                  coming soon.
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
                <Button size="md" variant="secondary">
                  Open profile in app
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
                <span className={terminalTitle()}>Example output</span>
              </div>

              <div className={terminalPromptLine()}>
                &gt; "Can I escape the £100k tax trap this year with salary sacrifice?"
              </div>

              <div className={terminalToolLine()}>
                ⚡ Calling tool: <code>simulate_uk_tax_and_pension_sacrifice</code>
              </div>

              <section
                className={terminalPayloadBox()}
                aria-label="Example tool output"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard-focusable (axe scrollable-region-focusable)
                tabIndex={0}
              >
                <span className={payloadComment()}>
                  {"// Example output: illustrative figures, not your data"}
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
              </section>

              <div className={terminalSummary()}>
                <strong className={terminalSummaryStrong()}>Example output:</strong> for an
                illustrative £114,200 gross salary, sacrificing £14,200 into a pension would reclaim
                £7,100 of tapered Personal Allowance (restoring the full £12,570 allowance), saving
                £8,804 in Income Tax and NI at an effective 62% marginal rate. These figures are an
                example, not advice.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
