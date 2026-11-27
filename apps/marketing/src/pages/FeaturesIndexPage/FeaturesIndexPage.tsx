import { VisuallyHidden } from "@repo/ui";
import { type FC, useRef } from "react";
import { FeatureIndex } from "../../components/FeatureIndex";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import { PageHero } from "../../components/PageHero";
import { PageMeta } from "../../components/PageMeta";
import { StartHere } from "../../components/StartHere";
import { dealEachMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { FEATURES_HERO_TONES } from "../../utils/areaOrbTones";
import { AI_CONNECTION, FEATURES_INDEX, MONEY_AREAS } from "../../utils/featureAreas";
import type { FeatureGroup } from "../../utils/featureIndex";
import { indexBand, mainContent } from "./FeaturesIndexPage.styles";

/** Each area's group heading links to its own page. */
const GROUP_HREFS: Partial<Record<FeatureGroup["key"], string>> = Object.fromEntries(
  [...MONEY_AREAS, AI_CONNECTION].map((feature) => [feature.key, feature.path]),
);

const groupsDealt = dealEachMoment("[data-deal-item]");

/** The index band: every group, each card dealt in as it nears the viewport. */
const EveryFeature: FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, groupsDealt);
  return (
    <MarketingBand
      bubbles="c"
      className={indexBand}
      id="every-feature"
      labelledBy="every-feature-title"
      tone="canvas"
    >
      {/* The approved prototype shows no heading here; the outline still needs one over the groups. */}
      <VisuallyHidden as="h2" id="every-feature-title">
        Every feature
      </VisuallyHidden>
      <div ref={ref}>
        <FeatureIndex band="canvas" groupHrefs={GROUP_HREFS} />
      </div>
    </MarketingBand>
  );
};

/**
 * "Everything Flump does" (D1; the approved features prototype, 27 Nov 2026, OTHER-PAGES-PLAN
 * slice P1): the hero with the live orbs (scene level S1), "Start here" as four glass cards, then
 * every feature as one line, grouped by area in glass cards (owner, 26 November 2026, option A).
 * Nothing is explained until a line is opened. The server render is the finished, still page:
 * every motion loads after first paint and none plays with reduced motion.
 */
export const FeaturesIndexPage: FC = () => (
  <MarketingPageShell>
    <PageMeta description={FEATURES_INDEX.meta.description} title={FEATURES_INDEX.meta.title} />

    <Header />

    <main className={mainContent} data-testid="features-index-page" id="main" tabIndex={-1}>
      <PageHero
        data-testid="features-hero"
        lead={FEATURES_INDEX.lead}
        note={FEATURES_INDEX.hint}
        previewHref="/preview"
        title={FEATURES_INDEX.heading}
        titleId="features-title"
        tones={FEATURES_HERO_TONES}
      />
      <StartHere />
      <EveryFeature />
    </main>

    <Footer />
  </MarketingPageShell>
);
