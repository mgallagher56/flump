import {
  BreathingRoomPreview,
  Button,
  Card,
  DashboardPreview,
  DebtBorrowingPreview,
  DebtHelpLink,
  MoneyHelperGuidance,
  PreviewFrame,
  type SampleHouseholdKey,
  SavingsPensionPreview,
} from "@repo/ui";
import { type FC, type ReactNode, useState } from "react";
import { AreaStrip } from "../../components/AreaStrip";
import { ClosingCta } from "../../components/ClosingCta";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { MarketingSection, type MarketingSectionTone } from "../../components/MarketingSection";
import { PageMeta } from "../../components/PageMeta";
import { TryItSection } from "../../components/TryItSection";
import { type Feature, MONEY_AREAS, RETIREMENT_SECTION } from "../../utils/featureAreas";
import { signupCta } from "../../utils/site";
import {
  areaLabel,
  ctaRow,
  depthList,
  factFooter,
  factGrid,
  factText,
  hero,
  heroHeading,
  heroInner,
  heroLead,
  heroNote,
  heroText,
  mainContent,
  pageShell,
  retirementBody,
  retirementText,
} from "./FeaturePage.styles";

export interface FeaturePageProps {
  feature: Feature;
  /** A small label beside the area name (the AI connection's "Preview"). */
  badge?: ReactNode;
  /** One more line under the lead (how a tester gets the AI connection). */
  heroNote?: string;
  /** Replaces the sample the data file names (the AI connection's example questions). */
  sample?: ReactNode;
  /** The tone of the last band inside `sample`, so the bands after it keep alternating. */
  sampleLastTone?: MarketingSectionTone;
  /** Replaces the depth list in "More detail when you want it". */
  moreDetail?: ReactNode;
}

/**
 * After the pale mint hero, bands alternate off-white (`card`) and pale mint (`canvas`), Midnight
 * and Mint (owner, 24 Nov 2026). A band that holds figures (a sample or a calculator) always stays
 * on the canvas, so the band after it starts the card again. The page ends on the dark closing band.
 */
const nextTone = (previous: MarketingSectionTone): MarketingSectionTone =>
  previous === "card" ? "canvas" : "card";

/** The working sample for an area (D6): the same sample components the preview page uses. */
const SAMPLES = {
  dashboard: { title: "Home", Preview: DashboardPreview },
  "breathing-room": { title: "Breathing room", Preview: BreathingRoomPreview },
  "savings-pension": { title: "Savings and pension", Preview: SavingsPensionPreview },
  "debt-borrowing": { title: "Debt and borrowing", Preview: DebtBorrowingPreview },
} as const;

const SampleSection: FC<{ sample: Feature["sample"] }> = ({ sample }) => {
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
  if (sample === "none") return null;
  const { title, Preview } = SAMPLES[sample];
  return (
    <MarketingSection
      id="see-it"
      subtitle="Sample figures for an example household. Switch between renting and paying a mortgage."
      title="See it with sample figures"
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
    </MarketingSection>
  );
};

/**
 * One template for every feature page (E42 S2, plan section 4.3), rendered from
 * `utils/featureAreas.ts` so the pages cannot drift apart: the hero, "What you see", a working
 * sample where one exists, "More detail when you want it", "Part of one picture", the kept
 * calculators on Pay and Debt and borrowing (D9), and a final call to action. Savings and pension
 * adds its Retirement plan section; it and Debt and borrowing carry the app's fixed MoneyHelper
 * line word for word (D10).
 */
export const FeaturePage: FC<FeaturePageProps> = ({
  feature,
  badge,
  heroNote: note,
  sample,
  sampleLastTone = "canvas",
  moreDetail,
}) => {
  const cta = signupCta();
  const titleId = `${feature.key}-title`;
  const currentArea = MONEY_AREAS.find((area) => area.key === feature.key)?.key;
  const showRetirement = feature.key === "savings-and-pension";
  // The hero is canvas, so "What you see" is card; a built-in sample holds figures (canvas).
  const whatYouSeeTone: MarketingSectionTone = "card";
  const afterSampleTone: MarketingSectionTone = sample
    ? sampleLastTone
    : feature.sample === "none"
      ? whatYouSeeTone
      : "canvas";
  const retirementTone = nextTone(afterSampleTone);
  const moreDetailTone = nextTone(showRetirement ? retirementTone : afterSampleTone);
  const onePictureTone = nextTone(moreDetailTone);

  return (
    <div className={pageShell()} data-testid={`feature-page-${feature.key}`}>
      <PageMeta description={feature.meta.description} title={feature.meta.title} />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <section aria-labelledby={titleId} className={hero()} data-testid="feature-hero">
          <div className={heroInner()}>
            <div className={heroText()}>
              <p className={areaLabel()}>{feature.name}</p>
              {badge}
              <h1 className={heroHeading()} id={titleId}>
                {feature.h1}
              </h1>
              <p className={heroLead()}>{feature.lead}</p>
              {note && <p className={heroNote()}>{note}</p>}
              <div className={ctaRow()}>
                <Button asChild size="lg" variant="primary">
                  <a href={cta.href}>{cta.label}</a>
                </Button>
                {feature.previewHref && (
                  <Button asChild size="lg" variant="outline">
                    <a href={feature.previewHref}>Interactive preview</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        <MarketingSection id="what-you-see" title="What you see" tone={whatYouSeeTone}>
          <ul className={factGrid()}>
            {feature.facts.map((fact) => (
              <Card as="li" key={fact} padding="md">
                <p className={factText()}>{fact}</p>
              </Card>
            ))}
          </ul>
          {feature.key === "debt-and-borrowing" && (
            <div className={factFooter()}>
              <DebtHelpLink />
            </div>
          )}
        </MarketingSection>

        {sample ?? <SampleSection sample={feature.sample} />}

        {showRetirement && (
          <MarketingSection id="retirement" title={RETIREMENT_SECTION.title} tone={retirementTone}>
            <div className={retirementBody()}>
              {RETIREMENT_SECTION.body.map((paragraph) => (
                <p className={retirementText()} key={paragraph}>
                  {paragraph}
                </p>
              ))}
              <MoneyHelperGuidance />
            </div>
          </MarketingSection>
        )}

        <MarketingSection
          id="more-detail"
          title="More detail when you want it"
          tone={moreDetailTone}
        >
          {moreDetail ?? (
            <ul className={depthList()}>
              {feature.depth.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </MarketingSection>

        <MarketingSection
          id="one-picture"
          subtitle="Use one area or all five. Together they make one picture of your money, on your Home page."
          title="Part of one picture"
          tone={onePictureTone}
        >
          <AreaStrip current={currentArea} />
        </MarketingSection>

        {(feature.key === "pay" || feature.key === "debt-and-borrowing") && (
          <TryItSection area={feature.key} />
        )}

        <ClosingCta
          cta={cta}
          data-testid="feature-final-cta"
          id="get-started"
          text="Start with a few rough figures."
          title="Ready to see your own figures?"
          titleId="feature-cta-title"
        />
      </main>

      <Footer />
    </div>
  );
};
