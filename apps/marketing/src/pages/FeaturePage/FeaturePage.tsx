import {
  BreathingRoomPreview,
  Button,
  Card,
  DashboardPreview,
  Illustration,
  PreviewFrame,
  type SampleHouseholdKey,
} from "@repo/ui";
import { type FC, type ReactNode, useState } from "react";
import { AreaStrip } from "../../components/AreaStrip";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { MarketingSection } from "../../components/MarketingSection";
import { PageMeta } from "../../components/PageMeta";
import { PayRiseTeaser } from "../../components/PayRiseTeaser";
import { type Feature, MONEY_AREAS } from "../../utils/featureAreas";
import { signupCta } from "../../utils/site";
import {
  areaLabel,
  ctaRow,
  depthList,
  factGrid,
  factText,
  finalCta,
  finalCtaBody,
  finalCtaTitle,
  hero,
  heroHeading,
  heroIllustration,
  heroInner,
  heroLead,
  heroNote,
  heroText,
  mainContent,
  pageShell,
} from "./FeaturePage.styles";

export interface FeaturePageProps {
  feature: Feature;
  /** A small label beside the area name (the AI connection's "Preview"). */
  badge?: ReactNode;
  /** One more line under the lead (how a tester gets the AI connection). */
  heroNote?: string;
  /** Replaces the sample the data file names (the AI connection's example questions). */
  sample?: ReactNode;
  /** Replaces the depth list in "More detail when you want it". */
  moreDetail?: ReactNode;
}

/** The working sample for an area (D6, option A): the same components the preview page uses. */
const SampleSection: FC<{ sample: Feature["sample"] }> = ({ sample }) => {
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
  if (sample === "pay-rise") return <PayRiseTeaser />;
  if (sample === "none") return null;
  return (
    <MarketingSection
      id="see-it"
      subtitle="Sample figures for an example household. Switch between renting and paying a mortgage."
      title="See it with sample figures"
    >
      {sample === "dashboard" ? (
        <PreviewFrame
          household={household}
          id="feature-frame-dashboard"
          onHouseholdChange={setHousehold}
          title="Home"
          titleAs="p"
        >
          <DashboardPreview household={household} id="feature-dashboard-preview" />
        </PreviewFrame>
      ) : (
        <PreviewFrame
          household={household}
          id="feature-frame-breathing-room"
          onHouseholdChange={setHousehold}
          title="Breathing room"
          titleAs="p"
        >
          <BreathingRoomPreview household={household} id="feature-breathing-room-preview" />
        </PreviewFrame>
      )}
    </MarketingSection>
  );
};

/** The two pages with no working sample yet show a scene instead (D6; previews follow in S8). */
const HERO_SCENES = {
  "savings-and-pension": "empty-savings",
  "debt-and-borrowing": "empty-debt",
} as const;

/**
 * One template for every feature page (E42 S2, plan section 4.3), rendered from
 * `utils/featureAreas.ts` so the pages cannot drift apart: the hero, "What you see", a working
 * sample where one exists, "More detail when you want it", "Part of one picture" and a final call
 * to action. The calculators section (section 6 of the template) arrives with PR 2.
 */
export const FeaturePage: FC<FeaturePageProps> = ({
  feature,
  badge,
  heroNote: note,
  sample,
  moreDetail,
}) => {
  const cta = signupCta();
  const titleId = `${feature.key}-title`;
  const scene = HERO_SCENES[feature.key as keyof typeof HERO_SCENES];
  const currentArea = MONEY_AREAS.find((area) => area.key === feature.key)?.key;

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
            {scene && (
              <div className={heroIllustration()} data-testid="feature-illustration">
                <Illustration scene={scene} size="md" settle={false} />
              </div>
            )}
          </div>
        </section>

        <MarketingSection id="what-you-see" title="What you see">
          <ul className={factGrid()}>
            {feature.facts.map((fact) => (
              <Card as="li" key={fact} padding="md">
                <p className={factText()}>{fact}</p>
              </Card>
            ))}
          </ul>
        </MarketingSection>

        {sample ?? <SampleSection sample={feature.sample} />}

        <MarketingSection id="more-detail" title="More detail when you want it">
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
          tone="sage"
        >
          <AreaStrip current={currentArea} />
        </MarketingSection>

        <section
          aria-labelledby="feature-cta-title"
          className={finalCta()}
          data-testid="feature-final-cta"
        >
          <h2 className={finalCtaTitle()} id="feature-cta-title">
            Ready to see your own figures?
          </h2>
          <p className={finalCtaBody()}>Start with a few rough figures.</p>
          <Button asChild size="lg" variant="primary">
            <a href={cta.href}>{cta.label}</a>
          </Button>
        </section>
      </main>

      <Footer />
    </div>
  );
};
