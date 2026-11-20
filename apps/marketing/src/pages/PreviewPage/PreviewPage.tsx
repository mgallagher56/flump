import {
  BreathingRoomPreview,
  Button,
  CheckInPreview,
  DashboardPreview,
  Illustration,
  PageHeader,
  PreviewFrame,
  type SampleHouseholdKey,
} from "@repo/ui";
import { type FC, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { signupCta } from "../../utils/site";
import {
  container,
  ctaBlock,
  ctaIllustration,
  ctaText,
  ctaTitle,
  mainContent,
  pageShell,
  previewSection,
  sectionDescription,
  sectionHeader,
  sectionHeading,
  sectionIllustration,
  sectionIntro,
  sectionLink,
  sectionLinkRow,
  sections,
} from "./PreviewPage.styles";

export const PREVIEW_PAGE_TITLE = "Interactive preview";
export const PREVIEW_PAGE_DESCRIPTION =
  "Explore how Flump helps you see where you stand each month. Choose a sample household to see the dashboard, try the monthly check-in, or model a change to your savings.";

/**
 * Product live preview page (PR A): accessible interactive previews of Flump's core moments.
 * Shows Dashboard snapshot, Monthly check-in card, and Breathing room scenario modeling.
 * Strictly fed from @flump/finance-engine over static renter and homeowner fixtures.
 */
export const PreviewPage: FC = () => {
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
  const cta = signupCta();

  return (
    <div className={pageShell()}>
      <PageMeta description={PREVIEW_PAGE_DESCRIPTION} title={`${PREVIEW_PAGE_TITLE} | Flump`} />

      <Header />

      <main className={mainContent()} id="main" tabIndex={-1}>
        <div className={container()}>
          <PageHeader description={PREVIEW_PAGE_DESCRIPTION} title={PREVIEW_PAGE_TITLE} />
          {/* The header keeps its own space below; the gap is between the moments only (P73). */}
          <div className={sections()}>
            {/* Moment 1: Dashboard Net Worth & section cards snapshot */}
            <section
              aria-labelledby="preview-section-dashboard-title"
              className={previewSection()}
              data-testid="preview-moment-dashboard"
            >
              <div className={sectionIntro()}>
                <h2 className={sectionHeading()} id="preview-section-dashboard-title">
                  Dashboard picture
                </h2>
                <p className={sectionDescription()}>
                  See your net worth, what is left over each month, and your key accounts at a
                  glance. Switch between renting and paying a mortgage to see how the figures
                  change.
                </p>
              </div>
              <PreviewFrame
                household={household}
                id="preview-frame-dashboard"
                onHouseholdChange={setHousehold}
                title="Dashboard"
                titleAs="p"
              >
                <DashboardPreview household={household} id="marketing-dashboard-preview" />
              </PreviewFrame>
              <p className={sectionLinkRow()}>
                <Link className={sectionLink()} to="/features/accounts">
                  About accounts and net worth
                </Link>
              </p>
            </section>

            {/* Moment 2: Monthly Check-In card interactive preview */}
            <section
              aria-labelledby="preview-section-checkin-title"
              className={previewSection()}
              data-testid="preview-moment-checkin"
            >
              <div className={sectionHeader()}>
                <div className={sectionIntro()}>
                  <h2 className={sectionHeading()} id="preview-section-checkin-title">
                    Monthly check-in
                  </h2>
                  <p className={sectionDescription()}>
                    Spend a couple of minutes once a month updating or confirming your balances.
                    Choose Update or No change to step through each sample account.
                  </p>
                </div>
                {/* Large screens only: on a phone it would push the figures below it down (B10). */}
                <div className={sectionIllustration()} data-testid="preview-illustration-checkin">
                  <Illustration scene="check-in" size="lg" settle={false} />
                </div>
              </div>
              <PreviewFrame
                household={household}
                id="preview-frame-checkin"
                onHouseholdChange={setHousehold}
                title="Check-in"
                titleAs="p"
              >
                <CheckInPreview household={household} id="marketing-checkin-preview" />
              </PreviewFrame>
              <p className={sectionLinkRow()}>
                <Link className={sectionLink()} to="/features/accounts">
                  About accounts and the monthly check-in
                </Link>
              </p>
            </section>

            {/* Moment 3: Model a change scenario slider & Breathing room live preview */}
            <section
              aria-labelledby="preview-section-breathing-room-title"
              className={previewSection()}
              data-testid="preview-moment-breathing-room"
            >
              <div className={sectionIntro()}>
                <h2 className={sectionHeading()} id="preview-section-breathing-room-title">
                  What a change would do
                </h2>
                <p className={sectionDescription()}>
                  See how long your savings would cover the essentials. Move the sliders to see what
                  a change in spending or savings would do.
                </p>
              </div>
              <PreviewFrame
                household={household}
                id="preview-frame-breathing-room"
                onHouseholdChange={setHousehold}
                title="Breathing room"
                titleAs="p"
              >
                <BreathingRoomPreview household={household} id="marketing-breathing-room-preview" />
              </PreviewFrame>
              <p className={sectionLinkRow()}>
                <Link className={sectionLink()} to="/features/budget">
                  About budget and breathing room
                </Link>
              </p>
            </section>

            {/* Call to action */}
            <div className={ctaBlock()} data-testid="preview-cta">
              <div className={ctaIllustration()} data-testid="preview-illustration-cta">
                <Illustration scene="onboarding" size="xl" settle={false} />
              </div>
              <h2 className={ctaTitle()}>Ready to see your own figures?</h2>
              <p className={ctaText()}>
                Flump is free during the beta. Enter a few rough numbers to see where you stand.
              </p>
              <Button asChild size="lg" variant="primary">
                <a href={cta.href}>{cta.label}</a>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
