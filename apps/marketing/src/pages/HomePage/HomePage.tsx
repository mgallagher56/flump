import { Button, VisuallyHidden } from "@repo/ui";
import type { FC } from "react";
import { BaselineSnapshotPreview } from "../../components/BaselineSnapshotPreview";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { HomeFAQ } from "../../components/HomeFAQ";
import { MarketingSection } from "../../components/MarketingSection";
import { MonthlyPictureSection } from "../../components/MonthlyPictureSection";
import { PageMeta } from "../../components/PageMeta";
import { PayRiseTeaser } from "../../components/PayRiseTeaser";
import { SecurityPrivacySection } from "../../components/SecurityPrivacySection";
import { SITE_TAGLINE, signupCta } from "../../utils/site";
import { getAppUrl } from "../../utils/url";
import {
  ctaRow,
  finalCta,
  finalCtaBody,
  finalCtaTitle,
  hero,
  heroHeading,
  heroInner,
  heroLead,
  heroText,
  mainContent,
  pageShell,
} from "./HomePage.styles";

/**
 * Marketing home (E16 PR 12, R2-10): five bands. Hero with an example preview, "What you can see",
 * the pay-rise teaser, a short security strip, then one band holding the FAQ and the final call to
 * action.
 * "Request an invite" appears twice in the page body (hero and end). MCP is a footer link and one
 * FAQ answer (D13).
 */
export const HomePage: FC = () => {
  const appUrl = getAppUrl();
  const cta = signupCta();

  return (
    <div className={pageShell()}>
      <PageMeta
        title={SITE_TAGLINE}
        description={`${SITE_TAGLINE}. See where you stand each month, whether you rent or pay a mortgage: your months of cover, what is left over and what a change would do, under UK rules.`}
      />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <section aria-labelledby="home-title" className={hero()} data-testid="home-hero">
          <div className={heroInner()}>
            <div className={heroText()}>
              <h1 className={heroHeading()} id="home-title">
                See where you stand each month
              </h1>
              <p className={heroLead()}>
                Enter a few rough numbers to see your months of cover and what is left over each
                month. Then see what a change would do under UK rules.
              </p>
              <div className={ctaRow()}>
                <Button asChild size="lg" variant="primary">
                  <a href={cta.href}>{cta.label}</a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href={`${appUrl}/sandbox`} rel="noreferrer" target="_blank">
                    Try sample data
                    <VisuallyHidden> (opens in a new tab)</VisuallyHidden>
                  </a>
                </Button>
              </div>
            </div>
            <BaselineSnapshotPreview />
          </div>
        </section>

        <MonthlyPictureSection />

        <PayRiseTeaser />

        <SecurityPrivacySection />

        {/* The fifth band: FAQ, then the final call to action in the same band (R2-10). */}
        <MarketingSection
          align="center"
          id="faq"
          title="Frequently asked questions"
          tone="sage"
          width="narrow"
        >
          <HomeFAQ />
          <div className={finalCta()} data-testid="home-final-cta" id="get-started">
            <h3 className={finalCtaTitle()} id="home-cta-title">
              Ready to see where you stand?
            </h3>
            <p className={finalCtaBody()}>Start with a few rough numbers. No bank login needed.</p>
            <Button asChild size="lg" variant="primary">
              <a href={cta.href}>{cta.label}</a>
            </Button>
          </div>
        </MarketingSection>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
