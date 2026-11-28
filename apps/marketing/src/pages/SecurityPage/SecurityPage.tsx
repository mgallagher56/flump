import { Illustration } from "@repo/ui";
import { type FC, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import { DisclosurePolicySection } from "../../components/DisclosurePolicySection";
import { Footer } from "../../components/Footer";
import { GlassOrb, type OrbTone } from "../../components/GlassOrb";
import { Header } from "../../components/Header";
import { HeroBand } from "../../components/HeroBand";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import { PageMeta } from "../../components/PageMeta";
import { SoftCard } from "../../components/SoftCard";
import { type HeroOrbTones, StillHeroOrbs } from "../../components/StillHeroOrbs";
import { arriveMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { AI_STAGING_SENTENCE } from "../../utils/aiConnection";
import {
  factCard,
  factLink,
  factList,
  factOrb,
  mainContent,
  reportingCard,
  split,
  splitPicture,
} from "./SecurityPage.styles";

/** The hero's orbs, biggest first (the approved security prototype). */
const SECURITY_HERO_TONES: HeroOrbTones = ["teal", "violet", "sky", "rose"];

interface SecurityFact {
  id: string;
  tone: OrbTone;
  text: ReactNode;
}

/** Facts that are true today, each said once (E16 PR 12). No promise of a future feature. */
const SECURITY_FACTS: SecurityFact[] = [
  {
    id: "own-figures",
    tone: "sky",
    text: "You type in your own figures. Flump does not connect to your bank, so no bank login is needed.",
  },
  {
    id: "no-payments",
    tone: "teal",
    text: "Flump has no feature to make payments or move money.",
  },
  {
    id: "ai",
    tone: "violet",
    text: (
      <>
        The{" "}
        <Link className={factLink} to="/features/ai-connection">
          AI connection
        </Link>{" "}
        (preview) answers questions from the figures you have saved. {AI_STAGING_SENTENCE}
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

const factsArrive = arriveMoment("[data-arrive-item]", 14);

/** The facts as glass cards, each marked by a small orb, beside the security document picture. */
const Facts: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, factsArrive);
  return (
    <MarketingBand id="facts" tone="card">
      <div className={split} ref={ref}>
        <ul aria-label="Security facts" className={factList}>
          {SECURITY_FACTS.map((fact) => (
            <SoftCard
              as="li"
              className={factCard}
              data-arrive-item=""
              data-fact={fact.id}
              id={fact.id}
              key={fact.id}
            >
              <GlassOrb className={factOrb} tone={fact.tone} />
              <p>{fact.text}</p>
            </SoftCard>
          ))}
        </ul>
        <div className={splitPicture} data-arrive-item="">
          <Illustration palette="orb" scene="security" size="md" variant="document" />
        </div>
      </div>
    </MarketingBand>
  );
};

/**
 * Security and privacy (E16 PR 12; the approved security prototype, 27 Nov 2026, OTHER-PAGES-PLAN
 * slice P2): the compact hero with still orbs (scene level S0, no script), the six facts that are
 * true today as glass cards beside the security document picture, then the reporting route in its
 * own card on a still band. No bubble field anywhere near the text; the orbs stay in the hero.
 */
export const SecurityPage: FC = () => (
  <MarketingPageShell>
    <PageMeta
      title="Security and privacy | Flump"
      description="What Flump does with your money and your figures today: no bank login, no payments, and how to report a security issue."
    />

    <Header />

    <main className={mainContent} id="main" tabIndex={-1}>
      <HeroBand
        compact
        data-testid="security-hero"
        lead="What Flump can and cannot do with your money and your figures."
        orbs={<StillHeroOrbs tones={SECURITY_HERO_TONES} />}
        title="Security and privacy"
        titleId="security-title"
      />
      <Facts />
      <MarketingBand id="reporting" tone="canvas">
        <SoftCard band="canvas" className={reportingCard}>
          <DisclosurePolicySection />
        </SoftCard>
      </MarketingBand>
    </main>

    <Footer />
  </MarketingPageShell>
);
