import {
  BreathingRoomPreview,
  DashboardPreview,
  DebtBorrowingPreview,
  DebtHelpLink,
  MoneyHelperGuidance,
  PreviewFrame,
  type SampleHouseholdKey,
  SavingsPensionPreview,
} from "@repo/ui";
import { type FC, useRef, useState } from "react";
import { AreaPills } from "../../components/AreaPills";
import { Footer } from "../../components/Footer";
import { GlassOrb } from "../../components/GlassOrb";
import { Header } from "../../components/Header";
import { JourneySample } from "../../components/JourneySample";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import type { MarketingSectionTone } from "../../components/MarketingSection";
import { PageHero } from "../../components/PageHero";
import { PageMeta } from "../../components/PageMeta";
import { SoftCard } from "../../components/SoftCard";
import { TicketClose } from "../../components/TicketClose";
import { TiltLight } from "../../components/TiltLight";
import { TryItSection } from "../../components/TryItSection";
import { SAMPLE_MOMENTS } from "../../motion/journey/sampleMoments";
import {
  arriveMoment,
  type BandMoment,
  dealInMoment,
  setPieceMoment,
} from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { AREA_HERO_TONES } from "../../utils/areaOrbTones";
import { type MoneyArea, RETIREMENT_SECTION } from "../../utils/featureAreas";
import {
  depthCard,
  depthList,
  depthOrb,
  factCard,
  factFooter,
  facts,
  factText,
  mainContent,
  retirementBody,
  retirementText,
  setPiece,
  split,
} from "./AreaPage.styles";

export interface AreaPageProps {
  feature: MoneyArea;
}

const next = (tone: MarketingSectionTone): MarketingSectionTone =>
  tone === "card" ? "canvas" : "card";

/** The working sample for an area (D6): the same sample components the preview page uses. */
const SAMPLES = {
  dashboard: { title: "Home", Preview: DashboardPreview },
  "breathing-room": { title: "Breathing room", Preview: BreathingRoomPreview },
  "savings-pension": { title: "Savings and pension", Preview: SavingsPensionPreview },
  "debt-borrowing": { title: "Debt and borrowing", Preview: DebtBorrowingPreview },
} as const;

const factsArrive = arriveMoment("[data-arrive-item]", 16);

/** The set piece plays its journey sample's moment, named by the sample's `data-sample`. */
const samplePlays: BandMoment = (kit, root) => {
  const name = root.querySelector<HTMLElement>("[data-sample]")?.dataset.sample ?? "";
  const moment = SAMPLE_MOMENTS[name];
  if (moment) setPieceMoment(moment)(kit, root);
};

/** "What you see": the three facts as cards beside the area's set piece from the journey. */
const WhatYouSee: FC<{ feature: MoneyArea }> = ({ feature }) => {
  const factsRef = useRef<HTMLDivElement>(null);
  const pieceRef = useRef<HTMLDivElement>(null);
  useGsapMoment(factsRef, factsArrive);
  useGsapMoment(pieceRef, samplePlays);
  return (
    <MarketingBand bubbles="a" id="what-you-see" title="What you see" tone="card">
      <div className={split}>
        <div ref={factsRef}>
          <ul className={facts}>
            {feature.facts.map((fact) => (
              <TiltLight as="li" data-arrive-item="" key={fact}>
                <SoftCard className={factCard}>
                  <p className={factText}>{fact}</p>
                </SoftCard>
              </TiltLight>
            ))}
          </ul>
          {feature.key === "debt-and-borrowing" && (
            <div className={factFooter}>
              <DebtHelpLink />
            </div>
          )}
        </div>
        <div className={setPiece} data-testid="area-set-piece" ref={pieceRef}>
          <JourneySample setPiece stop={feature.key} />
        </div>
      </div>
    </MarketingBand>
  );
};

/** The interactive sample, still and with no decoration behind it (production's words). */
const SampleBand: FC<{ sample: MoneyArea["sample"] }> = ({ sample }) => {
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
  if (sample === "none") return null;
  const { title, Preview } = SAMPLES[sample];
  return (
    <MarketingBand
      id="see-it"
      subtitle="Sample figures for an example household. Switch between renting and paying a mortgage."
      title="See it with sample figures"
      tone="canvas"
    >
      <PreviewFrame
        household={household}
        id={`feature-frame-${sample}`}
        onHouseholdChange={setHousehold}
        title={title}
        titleAs="p"
      >
        <Preview household={household} id={`feature-${sample}-preview`} />
      </PreviewFrame>
    </MarketingBand>
  );
};

const depthDealt = dealInMoment("[data-deal-item]");

const MoreDetail: FC<{ feature: MoneyArea; tone: MarketingSectionTone }> = ({ feature, tone }) => {
  const ref = useRef<HTMLUListElement>(null);
  useGsapMoment(ref, depthDealt);
  return (
    <MarketingBand bubbles="c" id="more-detail" title="More detail when you want it" tone={tone}>
      <ul className={depthList} ref={ref}>
        {feature.depth.map((item) => (
          <SoftCard
            as="li"
            band={tone === "canvas" ? "canvas" : "card"}
            className={depthCard}
            data-deal-item=""
            key={item}
          >
            <GlassOrb className={depthOrb} tone={AREA_HERO_TONES[feature.key][0]} />
            <span>{item}</span>
          </SoftCard>
        ))}
      </ul>
    </MarketingBand>
  );
};

/**
 * One template for the five area pages (OTHER-PAGES-PLAN slice P1, from the approved Pay and Debt
 * and borrowing prototypes at `prototypes/others`), rendered from `utils/featureAreas.ts` so the
 * pages cannot drift apart: the hero with the live orbs (scene level S1); "What you see" as cards
 * beside the area's set piece from the home journey, played once on arrival; the working sample
 * where the area has one, kept still; Savings and pension's Retirement plan; "More detail when you
 * want it" dealt in; "Part of one picture" as five pills; the kept calculators on Pay and Debt and
 * borrowing (D9), still; and the close with the getting started ticket. Bands alternate after the
 * canvas hero. Savings and pension and Debt and borrowing carry the app's fixed MoneyHelper and
 * debt help lines word for word (D10). The server render is the finished, still page.
 */
export const AreaPage: FC<AreaPageProps> = ({ feature }) => {
  const hasSample = feature.sample !== "none";
  const showRetirement = feature.key === "savings-and-pension";
  const hasTryIt = feature.key === "pay" || feature.key === "debt-and-borrowing";
  // The hero is canvas and "What you see" card; each band after takes the other tone.
  const afterSample: MarketingSectionTone = hasSample ? "canvas" : "card";
  const retirementTone = next(afterSample);
  const moreTone = next(showRetirement ? retirementTone : afterSample);
  const pictureTone = next(moreTone);
  // "Try it" is production's canvas band, so the close after it is card.
  const closeTone: MarketingSectionTone = hasTryIt ? "card" : next(pictureTone);

  return (
    <MarketingPageShell>
      <PageMeta description={feature.meta.description} title={feature.meta.title} />

      <Header />

      <main
        className={mainContent}
        data-testid={`feature-page-${feature.key}`}
        id="main"
        tabIndex={-1}
      >
        <PageHero
          data-testid="feature-hero"
          label={feature.name}
          lead={feature.lead}
          previewHref={feature.previewHref}
          title={feature.h1}
          titleId={`${feature.key}-title`}
          tones={AREA_HERO_TONES[feature.key]}
        />
        <WhatYouSee feature={feature} />
        <SampleBand sample={feature.sample} />
        {showRetirement && (
          <MarketingBand id="retirement" title={RETIREMENT_SECTION.title} tone={retirementTone}>
            <div className={retirementBody}>
              {RETIREMENT_SECTION.body.map((paragraph) => (
                <p className={retirementText} key={paragraph}>
                  {paragraph}
                </p>
              ))}
              <MoneyHelperGuidance />
            </div>
          </MarketingBand>
        )}
        <MoreDetail feature={feature} tone={moreTone} />
        <AreaPills current={feature.key} tone={pictureTone} />
        {hasTryIt && <TryItSection area={feature.key as "pay" | "debt-and-borrowing"} />}
        <TicketClose tone={closeTone} />
      </main>

      <Footer />
    </MarketingPageShell>
  );
};
