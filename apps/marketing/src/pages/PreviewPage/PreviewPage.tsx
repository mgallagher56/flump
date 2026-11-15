import {
  BreathingRoomPreview,
  Button,
  CheckInPreview,
  DashboardPreview,
  PageHeader,
  PreviewFrame,
  type SampleHouseholdKey,
} from "@repo/ui";
import { type FC, useState } from "react";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { PageMeta } from "../../components/PageMeta";
import { signupCta } from "../../utils/site";
import {
  container,
  ctaBlock,
  ctaText,
  ctaTitle,
  mainContent,
  pageShell,
  previewSection,
  sectionDescription,
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

          {/* Moment 1: Dashboard Net Worth & section cards snapshot */}
          <section
            aria-labelledby="preview-section-dashboard-title"
            className={previewSection()}
            data-testid="preview-moment-dashboard"
          >
            <h2 id="preview-section-dashboard-title" className="sr-only">
              Dashboard picture
            </h2>
            <p className={sectionDescription()}>
              See your net worth, what is left over each month, and your key accounts at a glance.
              Switch between renting and paying a mortgage to see how the figures change.
            </p>
            <PreviewFrame
              household={household}
              id="preview-frame-dashboard"
              onHouseholdChange={setHousehold}
              title="Dashboard picture"
            >
              <DashboardPreview household={household} id="marketing-dashboard-preview" />
            </PreviewFrame>
          </section>

          {/* Moment 2: Monthly Check-In card interactive preview */}
          <section
            aria-labelledby="preview-section-checkin-title"
            className={previewSection()}
            data-testid="preview-moment-checkin"
          >
            <h2 id="preview-section-checkin-title" className="sr-only">
              Monthly check-in
            </h2>
            <p className={sectionDescription()}>
              Spend a couple of minutes once a month updating or confirming your balances. Click
              Update or No change to step through each sample account.
            </p>
            <PreviewFrame
              household={household}
              id="preview-frame-checkin"
              onHouseholdChange={setHousehold}
              title="Monthly check-in"
            >
              <CheckInPreview household={household} id="marketing-checkin-preview" />
            </PreviewFrame>
          </section>

          {/* Moment 3: Model a change scenario slider & Breathing room live preview */}
          <section
            aria-labelledby="preview-section-breathing-room-title"
            className={previewSection()}
            data-testid="preview-moment-breathing-room"
          >
            <h2 id="preview-section-breathing-room-title" className="sr-only">
              Model a change to your savings
            </h2>
            <p className={sectionDescription()}>
              See how long your savings would cover essential spending if your income stopped. Move
              the sliders to see what a spending cut or extra savings would do.
            </p>
            <PreviewFrame
              household={household}
              id="preview-frame-breathing-room"
              onHouseholdChange={setHousehold}
              title="Model a change"
            >
              <BreathingRoomPreview household={household} id="marketing-breathing-room-preview" />
            </PreviewFrame>
          </section>

          {/* Call to action */}
          <div className={ctaBlock()} data-testid="preview-cta">
            <h2 className={ctaTitle()}>Ready to see your own figures?</h2>
            <p className={ctaText()}>
              Flump is free during the beta. Enter a few rough numbers to see where you stand.
            </p>
            <Button asChild size="lg" variant="primary">
              <a href={cta.href}>{cta.label}</a>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PreviewPage;
