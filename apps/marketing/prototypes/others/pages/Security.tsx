import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { DisclosurePolicySection } from "../../../src/components/DisclosurePolicySection";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { AI_STAGING_SENTENCE } from "../../../src/utils/aiConnection";
import { GlassOrb } from "../../p11/art/GlassOrb";
import { SecurityPicture } from "../../p11/art/Pictures";
import type { OrbToneName } from "../../p11/journeyTypes";
import { usePointerLightAndTilt } from "../../shared/round3";
import { arriveAll, OBand, OHero } from "../blocks";
import { ProtoFooter } from "../chrome/ProtoFooter";
import { ProtoHeader } from "../chrome/ProtoHeader";
import { OtherShell } from "../OtherShell";
import { heroLayout, pageLayout } from "../scene/layouts";
import { PageOrbs } from "../scene/SceneLayers";

/*
 * Security and privacy (family F). Production's content: the title and its line, six facts that
 * are true today, and the reporting route. In round one's language: the hero with still orbs, the
 * facts as glass cards beside prototype 11's security card (its one picture), each fact marked by
 * a small orb instead of an icon tile, then the reporting route in its own card. Never a bubble
 * behind text here; orbs stay in the hero. Copy: production's SECURITY_FACTS, word for word.
 */

const TONES = ["teal", "violet", "sky", "rose"] as const;

const FACTS: { id: string; tone: OrbToneName; text: React.ReactNode }[] = [
  {
    id: "own-figures",
    tone: "sky",
    text: "You type in your own figures. Flump does not connect to your bank, so no bank login is needed.",
  },
  { id: "no-payments", tone: "teal", text: "Flump has no feature to make payments or move money." },
  {
    id: "ai",
    tone: "violet",
    text: (
      <>
        The <Link to="/features/ai-connection">AI connection</Link> (preview) answers questions from
        the figures you have saved. {AI_STAGING_SENTENCE}
      </>
    ),
  },
  {
    id: "download-figures",
    tone: "sky",
    text: "You can download a copy of your saved figures from Settings at any time.",
  },
  {
    id: "delete-account",
    tone: "teal",
    text: "You can delete your account and saved data from Settings.",
  },
  {
    id: "no-email-requests",
    tone: "rose",
    text: "Flump never asks for a password, code or bank login by email.",
  },
];

const Body: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OHero
        compact
        ctas={null}
        layout={heroLayout(TONES)}
        lead="What Flump can and cannot do with your money and your figures."
        title="Security and privacy"
        titleId="security-title"
      />
      <OBand id="facts" moment={arriveAll(".o2-card, .o2-split__picture", 14)} tone="card">
        <div className="o2-split">
          <ul aria-label="Security facts" className="o2-cards o2-cards--stack">
            {FACTS.map((fact) => (
              <li className="o2-card p11-soft-card" data-fact={fact.id} id={fact.id} key={fact.id}>
                <GlassOrb className="o2-card__orb" size={20} tone={fact.tone} />
                <p>{fact.text}</p>
              </li>
            ))}
          </ul>
          <div className="o2-split__picture">
            <SecurityPicture />
          </div>
        </div>
      </OBand>
      <OBand id="reporting" labelledBy="disclosure-policy-heading" solid tone="canvas">
        <div className="o2-prose p11-soft-card">
          <DisclosurePolicySection />
        </div>
      </OBand>
    </main>
  );
};

export const SecurityProto: FC = () => (
  <OtherShell defaultLevel="s0" id="security">
    <PageOrbs layout={pageLayout(TONES)} />
    <ProtoHeader />
    <Body />
    <ProtoFooter />
  </OtherShell>
);
