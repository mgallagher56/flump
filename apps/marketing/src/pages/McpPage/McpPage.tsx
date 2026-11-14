import { Button, Card, CollapsibleDrawer, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import { signupCta } from "../../utils/site";
import {
  body,
  container,
  heading,
  heroBlock,
  lead,
  mainContent,
  pageShell,
  questionCard,
  questionList,
  section,
  sectionHeading,
  stepList,
  techBody,
  techDisclosure,
  techHeading,
  techList,
  toolDescription,
  toolItem,
  toolList,
  toolName,
} from "./McpPage.styles";
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
 * The AI connection page (E16 PR 12): written for a household reader first. What it is in two
 * sentences, three example questions, how to turn it on, then one collapsed "Technical details".
 * One "Request an invite", at the top: the page is short enough that a second one only repeats it.
 */
export const McpPage: FC = () => {
  const cta = signupCta();

  return (
    <div className={pageShell()} data-testid="mcp-marketing-page" id="mcp-marketing-page">
      <PageMeta
        title="AI connection (preview) | Flump"
        description={`Preview: connect an AI assistant such as Claude Desktop to Flump and ask questions about the figures you have saved. Tax and debt figures are calculated by Flump, not by the AI model. ${AI_STAGING_SENTENCE}`}
      />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <div className={container()}>
          <section aria-labelledby="mcp-title" className={heroBlock()}>
            <StatusBadge data-testid="mcp-preview-badge" size="sm" variant="neutral">
              Preview
            </StatusBadge>
            <h1 className={heading()} id="mcp-title">
              Ask an AI assistant about your figures
            </h1>
            <p className={lead()}>
              Flump MCP (short for Model Context Protocol) links an AI assistant, such as Claude
              Desktop or Cursor, to the figures you have saved in Flump, so it can answer your
              questions. Tax and debt figures are calculated by Flump, not by the AI model.
            </p>
            <Button asChild size="lg" variant="primary">
              <a href={cta.href}>{cta.label}</a>
            </Button>
          </section>

          <section aria-labelledby="mcp-questions" className={section()}>
            <h2 className={sectionHeading()} id="mcp-questions">
              Questions you could ask
            </h2>
            <ul className={questionList()}>
              {EXAMPLE_QUESTIONS.map((question) => (
                <Card as="li" className={questionCard()} key={question} padding="md">
                  {question}
                </Card>
              ))}
            </ul>
          </section>

          <section aria-labelledby="mcp-setup" className={section()} id="setup">
            <h2 className={sectionHeading()} id="mcp-setup">
              How to turn it on
            </h2>
            <ol className={stepList()}>
              <li>
                {cta.external
                  ? `${cta.label}, then sign in to Flump.`
                  : `${cta.label} and sign in to Flump.`}
              </li>
              <li>Create an access token in your profile (you can revoke it any time).</li>
              <li>
                Add Flump to your AI assistant with that token. For now it runs from source code,
                with no installer or setup guide yet.
              </li>
            </ol>
          </section>

          <div className={techDisclosure()}>
            <CollapsibleDrawer title="Show technical details" variant="quiet">
              <div className={techBody()} data-testid="mcp-technical-details">
                <div className={section()}>
                  <h3 className={techHeading()}>How it works</h3>
                  <ul className={techList()}>
                    <li>
                      Tools run the same calculation code as the Flump app, so the same inputs
                      always give the same tax, debt and net worth figures.
                    </li>
                    <li>
                      The tools that read your data carry <code>readOnlyHint: true</code>. No Flump
                      MCP tool deletes data. Flump MCP tools have no payment feature.
                    </li>
                    <li>Institution names are replaced with generic labels by default.</li>
                    <li>
                      Each token is limited to 60 tool calls a minute and 300 an hour, and records
                      its total tool calls.
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
        </div>
      </main>

      <Footer />
    </div>
  );
};
