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
              Ask Claude or Cursor about your own saved finances
            </h2>

            <p className={spotlightLead()}>
              Flump's MCP server lets MCP clients such as Claude Desktop and Cursor answer questions
              from the accounts, budget, debts and tax records you have saved in Flump. The tools
              read your saved data, and UK tax figures come from a deterministic engine. Staging an
              import for you to review is being rolled out and is not on every account yet. Where it
              is available it is off by default, and nothing is saved until you confirm it in Flump.
            </p>

            <div className={stack({ gap: "3" })}>
              <div className={bulletRow()}>
                <FiCheckCircle className={bulletIcon({ tone: "positive" })} size={18} />
                <span>
                  <strong>Deterministic engine:</strong> UK tax bands, debt payoff and net worth
                  projections.
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
                &gt; "Which income tax band does my salary reach this tax year, and how much income
                tax is that?"
              </div>

              <div className={terminalToolLine()}>
                ⚡ Calling tool: <code>get_tax_year_position</code>
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
                &nbsp;&nbsp;<span className={payloadKey()}>"income":</span>{" "}
                <span className={payloadBracket()}>{"{"}</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className={payloadKey()}>"totalGbp":</span>{" "}
                <span className={payloadNum()}>39000</span>
                <br />
                &nbsp;&nbsp;<span className={payloadBracket()}>{"}"}</span>,
                <br />
                &nbsp;&nbsp;<span className={payloadKey()}>"personalAllowance":</span>{" "}
                <span className={payloadBracket()}>{"{"}</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className={payloadKey()}>"position":</span>{" "}
                <span className={payloadNum()}>"below_taper"</span>
                <br />
                &nbsp;&nbsp;<span className={payloadBracket()}>{"}"}</span>,
                <br />
                &nbsp;&nbsp;<span className={payloadKey()}>"incomeTaxBands":</span>{" "}
                <span className={payloadBracket()}>{"{"}</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className={payloadKey()}>"topBand":</span>{" "}
                <span className={payloadNum()}>"Basic"</span>
                <br />
                &nbsp;&nbsp;<span className={payloadBracket()}>{"}"}</span>,
                <br />
                &nbsp;&nbsp;<span className={payloadKey()}>"estimate":</span>{" "}
                <span className={payloadBracket()}>{"{"}</span>
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className={payloadKey()}>"incomeTaxGbp":</span>{" "}
                <span className={payloadNum()}>5286</span>,
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className={payloadKey()}>"payeTaxGbp":</span>{" "}
                <span className={payloadNum()}>5286</span>
                <br />
                &nbsp;&nbsp;<span className={payloadBracket()}>{"}"}</span>
                <br />
                <span className={payloadBracket()}>{"}"}</span>
              </section>

              <div className={terminalSummary()}>
                <strong className={terminalSummaryStrong()}>Example output:</strong> for an
                illustrative £39,000 salary recorded for 2026/27 in England, Wales or Northern
                Ireland, income sits below the Personal Allowance taper and its top slice is in the
                basic rate band. Estimated income tax is £5,286. These figures are an unverified
                example, not advice.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
