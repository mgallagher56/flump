import { CollapsibleDrawer, Illustration, StatusBadge } from "@repo/ui";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { AreaPills } from "../../components/AreaPills";
import { Footer } from "../../components/Footer";
import { GlassOrb, type OrbTone } from "../../components/GlassOrb";
import { Header } from "../../components/Header";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import { PageHero } from "../../components/PageHero";
import { PageMeta } from "../../components/PageMeta";
import { SoftCard } from "../../components/SoftCard";
import { TicketClose } from "../../components/TicketClose";
import { TiltLight } from "../../components/TiltLight";
import { arriveMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import { AI_HERO_TONES } from "../../utils/areaOrbTones";
import { AI_CONNECTION, AI_CONNECTION_ACCESS } from "../../utils/featureAreas";
import {
  body,
  card,
  cardOrb,
  cards,
  heroBadge,
  inlineLink,
  mainContent,
  noLeftBubble,
  prose,
  section,
  setupSection,
  split,
  splitPicture,
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

const cardsArrive = arriveMoment("[data-arrive-item]", 16);
const questionsArrive = arriveMoment("[data-arrive-item]", 12);

/** "What you see": the three facts as cards beside one picture, the home tile's question card. */
const WhatYouSee: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, cardsArrive);
  return (
    <MarketingBand
      bubbles="a"
      className={noLeftBubble}
      id="what-you-see"
      title="What you see"
      tone="card"
    >
      <div className={split} ref={ref}>
        <ul className={cards({ stack: true })}>
          {AI_CONNECTION.facts.map((fact) => (
            <TiltLight as="li" data-arrive-item="" key={fact}>
              <SoftCard className={card}>
                <p>{fact}</p>
              </SoftCard>
            </TiltLight>
          ))}
        </ul>
        <div className={splitPicture} data-arrive-item="">
          <Illustration palette="orb" scene="feature-ai-connection" size="sm" variant="document" />
        </div>
      </div>
    </MarketingBand>
  );
};

/** The example questions as cards, each with a small orb (no orb near code or setup: MK15). */
const Questions: FC = () => {
  const ref = useRef<HTMLUListElement>(null);
  useGsapMoment(ref, questionsArrive);
  return (
    <MarketingBand id="questions" title="Questions you could ask" tone="canvas">
      <ul className={cards()} ref={ref}>
        {EXAMPLE_QUESTIONS.map((question, i) => (
          <TiltLight as="li" data-arrive-item="" key={question}>
            <SoftCard band="canvas" className={card}>
              <GlassOrb
                className={cardOrb}
                tone={AI_HERO_TONES[i % AI_HERO_TONES.length] as OrbTone}
              />
              <p>{question}</p>
            </SoftCard>
          </TiltLight>
        ))}
      </ul>
    </MarketingBand>
  );
};

/**
 * The AI connection page (E42 S2b; the approved AI connection prototype, 27 Nov 2026,
 * OTHER-PAGES-PLAN slice P1): the hero with the live orbs (scene level S1) and the Preview label;
 * "What you see" beside one picture; the example questions as cards; "How to get it" and the
 * technical details as plain, still text with nothing moving near the setup steps or the code
 * (MK15); the five areas; the close. At `/features/ai-connection` (`/mcp` answers 301 here).
 * Access stays with the accounts the owner switches on, so the hero says how a tester gets it in
 * the decided words and no line reads as if every account has it.
 *
 * Decided by the coordinator on 20 November 2026 (plan section 7.1): "How to get it" is version 1,
 * with "Ask us" linking to the Contact page, and the small "Preview" label stays while access is
 * limited to named accounts. The web app's Settings link lands on "How to get it" (`#setup`).
 */
export const AiConnectionPage: FC = () => (
  <MarketingPageShell>
    <PageMeta description={AI_CONNECTION.meta.description} title={AI_CONNECTION.meta.title} />

    <Header />

    <main className={mainContent} data-testid="feature-page-ai-connection" id="main" tabIndex={-1}>
      <PageHero
        badge={
          <StatusBadge
            className={heroBadge}
            data-testid="mcp-preview-badge"
            size="sm"
            variant="neutral"
          >
            Preview
          </StatusBadge>
        }
        data-testid="feature-hero"
        lead={AI_CONNECTION.lead}
        note={AI_CONNECTION_ACCESS}
        title={AI_CONNECTION.h1}
        titleId="ai-connection-title"
        tones={AI_HERO_TONES}
      />
      <WhatYouSee />
      <Questions />
      {/* Version 1 (coordinator, 20 November 2026): promises nothing about who is switched on. */}
      <MarketingBand className={setupSection()} id="setup" title="How to get it" tone="card">
        <div className={prose}>
          <p data-testid="mcp-how-to-get-it">
            While Flump is being tested, the AI connection is switched on one account at a time.{" "}
            <Link className={inlineLink()} to="/contact">
              Ask us
            </Link>{" "}
            to switch it on for yours. Once it is on, create an access token in Settings and add
            Flump to your AI assistant.
          </p>
        </div>
      </MarketingBand>
      <MarketingBand id="more-detail" title="More detail when you want it" tone="canvas">
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
      </MarketingBand>
      <AreaPills tone="card" />
      <TicketClose tone="canvas" />
    </main>

    <Footer />
  </MarketingPageShell>
);
