import { Card, CollapsibleDrawer, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { MarketingSection } from "../../components/MarketingSection";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import { AI_CONNECTION, AI_CONNECTION_ACCESS } from "../../utils/featureAreas";
import { FeaturePage } from "../FeaturePage";
import {
  body,
  inlineLink,
  questionCard,
  questionList,
  section,
  setupSection,
  techBody,
  techDisclosure,
  techHeading,
  techList,
  toolDescription,
  toolItem,
  toolList,
  toolName,
} from "./AiConnectionPage.styles";
import { MCP_TOOLS } from "./mcpTools";

/** Three questions a household might ask, each answered by one of the tools below. */
export const EXAMPLE_QUESTIONS = [
  "How much do I spend each month on essentials, and what is left over?",
  "When does the fixed rate on my mortgage end?",
  "Which Income Tax band does my salary reach this tax year?",
] as const;

const READ_AND_CALCULATE = MCP_TOOLS.filter((tool) => tool.kind !== "stage");
const STAGING = MCP_TOOLS.filter((tool) => tool.kind === "stage");

const count = new Intl.NumberFormat("en-GB");

/**
 * The AI connection page (E42 S2b): a feature page like the five areas, at
 * `/features/ai-connection` (`/mcp` answers 301 here). Access stays with the accounts the owner
 * switches on, so the hero says how a tester gets it in the decided words and no line reads as if
 * every account has it.
 *
 * Decided by the coordinator on 20 November 2026 (plan section 7.1): "How to get it" is version 1,
 * with "Ask us" linking to the Contact page, and the small "Preview" label stays while access is
 * limited to named accounts. The web app's Settings link lands on "How to get it" (`#setup`).
 */
export const AiConnectionPage: FC = () => {
  return (
    <FeaturePage
      badge={
        <StatusBadge data-testid="mcp-preview-badge" size="sm" variant="neutral">
          Preview
        </StatusBadge>
      }
      feature={AI_CONNECTION}
      heroNote={AI_CONNECTION_ACCESS}
      moreDetail={
        <div className={techDisclosure()}>
          <CollapsibleDrawer title="Show technical details" variant="quiet">
            <div className={techBody()} data-testid="mcp-technical-details">
              <div className={section()}>
                <h3 className={techHeading()}>How it works</h3>
                <ul className={techList()}>
                  <li>
                    The AI connection is Flump MCP, short for Model Context Protocol. It works with
                    AI assistants that support MCP, such as Claude Desktop or Cursor.
                  </li>
                  <li>The steps to connect are in the Flump app, under Settings, then Security.</li>
                  <li>
                    Tools run the same calculation code as the Flump app, so the same inputs always
                    give the same tax, debt and net worth figures.
                  </li>
                  <li>
                    The tools that read your data carry <code>readOnlyHint: true</code>. No Flump
                    MCP tool deletes data. Flump MCP tools have no payment feature.
                  </li>
                  <li>Institution names are replaced with generic labels by default.</li>
                  <li>
                    Each token is limited to 60 tool calls a minute and 300 an hour, and records its
                    total tool calls.
                  </li>
                </ul>
              </div>

              <div className={section()}>
                <h3 className={techHeading()}>
                  {count.format(READ_AND_CALCULATE.length)} tools that read or calculate
                </h3>
                <ul className={toolList()}>
                  {READ_AND_CALCULATE.map((tool) => (
                    <li
                      className={toolItem()}
                      data-testid={`mcp-tool-${tool.name}`}
                      key={tool.name}
                    >
                      <code className={toolName()}>{tool.name}</code>
                      <p className={toolDescription()}>{tool.description}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={section()}>
                <h3 className={techHeading()}>
                  {count.format(STAGING.length)} staging tools, off by default
                </h3>
                <p className={body()}>{AI_STAGING_SENTENCE}</p>
                <ul className={toolList()}>
                  {STAGING.map((tool) => (
                    <li
                      className={toolItem()}
                      data-testid={`mcp-tool-${tool.name}`}
                      key={tool.name}
                    >
                      <code className={toolName()}>{tool.name}</code>
                      <p className={toolDescription()}>{tool.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CollapsibleDrawer>
        </div>
      }
      sample={
        <>
          <MarketingSection id="questions" title="Questions you could ask">
            <ul className={questionList()}>
              {EXAMPLE_QUESTIONS.map((question) => (
                <Card as="li" className={questionCard()} key={question} padding="md">
                  {question}
                </Card>
              ))}
            </ul>
          </MarketingSection>
          {/* Version 1 (coordinator, 20 November 2026): promises nothing about who is switched on. */}
          <MarketingSection className={setupSection()} id="setup" title="How to get it">
            <p className={body()} data-testid="mcp-how-to-get-it">
              While Flump is being tested, the AI connection is switched on one account at a time.{" "}
              <Link className={inlineLink()} to="/contact">
                Ask us
              </Link>{" "}
              to switch it on for yours. Once it is on, create an access token in Settings and add
              Flump to your AI assistant.
            </p>
          </MarketingSection>
        </>
      }
    />
  );
};
