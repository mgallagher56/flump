import { CollapsibleDrawer, StatusBadge } from "@repo/ui";
import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { EXAMPLE_QUESTIONS } from "../../../src/pages/AiConnectionPage";
import {
  body,
  section,
  techBody,
  techDisclosure,
  techHeading,
  techList,
  toolDescription,
  toolItem,
  toolList,
  toolName,
} from "../../../src/pages/AiConnectionPage/AiConnectionPage.styles";
import { MCP_TOOLS } from "../../../src/pages/AiConnectionPage/mcpTools";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { AI_STAGING_SENTENCE } from "../../../src/utils/aiConnection";
import { AI_CONNECTION, AI_CONNECTION_ACCESS } from "../../../src/utils/featureAreas";
import { GlassOrb } from "../../p11/art/GlassOrb";
import { TilePicture } from "../../p11/art/Pictures";
import { LitCtas } from "../../p11/hero/LitCtas";
import { usePointerLightAndTilt } from "../../shared/round3";
import { arriveAll, OBand, OHero } from "../blocks";
import { AreaPills, CloseBand } from "../blocks2";
import { ProtoFooter } from "../chrome/ProtoFooter";
import { ProtoHeader } from "../chrome/ProtoHeader";
import { OtherShell } from "../OtherShell";
import { heroLayout, pageLayout } from "../scene/layouts";
import { PageOrbs } from "../scene/SceneLayers";

/*
 * The AI connection page (family C), production's FeaturePage sections in order, in round one's
 * language: the hero with the scene and the Preview label; What you see beside one document card
 * (the question card from the home tiles); the example questions as glass cards; How to get it as
 * plain text (setup steps: nothing moves near them); the technical details exactly as production,
 * in a solid band with no decoration near the code; the five areas; the close.
 *
 * Copy from production: `utils/featureAreas`, `utils/aiConnection`, `EXAMPLE_QUESTIONS` and
 * `MCP_TOOLS`; the lines AiConnectionPage and FeaturePage write inline are copied word for word.
 */

const TONES = ["rose", "sky", "violet", "teal"] as const;
const READ_AND_CALCULATE = MCP_TOOLS.filter((tool) => tool.kind !== "stage");
const STAGING = MCP_TOOLS.filter((tool) => tool.kind === "stage");
const count = new Intl.NumberFormat("en-GB");

const WhatYouSee: FC = () => (
  <OBand
    bubbles="a"
    className="o2-no-left-bubble"
    id="what-you-see"
    moment={arriveAll(".o2-card, .o2-split__picture", 16)}
    title="What you see"
    tone="card"
  >
    <div className="o2-split">
      <ul className="o2-cards o2-cards--stack">
        {AI_CONNECTION.facts.map((fact) => (
          <li className="o2-card p11-soft-card" data-tilt="" key={fact}>
            <p>{fact}</p>
          </li>
        ))}
      </ul>
      <div className="o2-split__picture">
        <TilePicture area="ai-connection" />
      </div>
    </div>
  </OBand>
);

const Questions: FC = () => (
  <OBand
    id="questions"
    moment={arriveAll(".o2-card", 12)}
    title="Questions you could ask"
    tone="canvas"
  >
    <ul className="o2-cards">
      {EXAMPLE_QUESTIONS.map((question, i) => (
        <li className="o2-card p11-soft-card" data-tilt="" key={question}>
          <GlassOrb className="o2-card__orb" size={20} tone={TONES[i % TONES.length] ?? "sky"} />
          <p>{question}</p>
        </li>
      ))}
    </ul>
  </OBand>
);

/** Setup steps: plain, still and solid. Production's words (AiConnectionPage, version 1). */
const HowToGetIt: FC = () => (
  <OBand id="setup" solid title="How to get it" tone="card">
    <div className="o2-prose">
      <p data-testid="mcp-how-to-get-it">
        While Flump is being tested, the AI connection is switched on one account at a time.{" "}
        <Link to="/contact">Ask us</Link> to switch it on for yours. Once it is on, create an access
        token in Settings and add Flump to your AI assistant.
      </p>
    </div>
  </OBand>
);

/** Production's technical drawer, word for word, with its own styles. Code: nothing moves here. */
const MoreDetail: FC = () => (
  <OBand id="more-detail" solid title="More detail when you want it" tone="canvas">
    <div className={techDisclosure()}>
      <CollapsibleDrawer title="Show technical details" variant="quiet">
        <div className={techBody()} data-testid="mcp-technical-details">
          <div className={section()}>
            <h3 className={techHeading()}>How it works</h3>
            <ul className={techList()}>
              <li>
                The AI connection is Flump MCP, short for Model Context Protocol. It works with AI
                assistants that support MCP, such as Claude Desktop or Cursor.
              </li>
              <li>The steps to connect are in the Flump app, under Settings, then Security.</li>
              <li>
                Tools run the same calculation code as the Flump app, so the same inputs always give
                the same tax, debt and net worth figures.
              </li>
              <li>
                The tools that read your data carry <code>readOnlyHint: true</code>. No Flump MCP
                tool deletes data. Flump MCP tools have no payment feature.
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
                <li className={toolItem()} key={tool.name}>
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
                <li className={toolItem()} key={tool.name}>
                  <code className={toolName()}>{tool.name}</code>
                  <p className={toolDescription()}>{tool.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CollapsibleDrawer>
    </div>
  </OBand>
);

const Body: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OHero
        ctas={<LitCtas secondary={false} />}
        layout={heroLayout(TONES)}
        lead={AI_CONNECTION.lead}
        title={AI_CONNECTION.h1}
        titleId="ai-connection-title"
      >
        <StatusBadge className="o2-hero__badge" size="sm" variant="neutral">
          Preview
        </StatusBadge>
        <p className="o2-hero__note">{AI_CONNECTION_ACCESS}</p>
      </OHero>
      <WhatYouSee />
      <Questions />
      <HowToGetIt />
      <MoreDetail />
      {/* Production's words (FeaturePage). */}
      <AreaPills
        subtitle="Use one area or all five. Together they make one picture of your money, on your Home page."
        tone="card"
      />
      <CloseBand
        text="Start with a few rough figures."
        title="Ready to see your own figures?"
        titleId="feature-cta-title"
        tone="canvas"
      />
    </main>
  );
};

export const AiConnectionProto: FC = () => (
  <OtherShell defaultLevel="s1" id="ai">
    <PageOrbs layout={pageLayout(TONES)} />
    <ProtoHeader />
    <Body />
    <ProtoFooter />
  </OtherShell>
);
