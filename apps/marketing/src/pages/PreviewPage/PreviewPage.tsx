import {
  BreathingRoomPreview,
  CheckInPreview,
  DashboardPreview,
  Illustration,
  PreviewFrame,
  type SampleHouseholdKey,
} from "@repo/ui";
import { type FC, type ReactNode, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { HeroBand } from "../../components/HeroBand";
import { MarketingBand } from "../../components/MarketingBand";
import { MarketingPageShell } from "../../components/MarketingPageShell";
import { PageMeta } from "../../components/PageMeta";
import { type HeroOrbTones, StillHeroOrbs } from "../../components/StillHeroOrbs";
import { TicketClose } from "../../components/TicketClose";
import { arriveMoment } from "../../motion/moments/bandMoments";
import { useGsapMoment } from "../../motion/useGsapMoment";
import {
  mainContent,
  moment,
  momentFrame,
  momentHead,
  momentIntro,
  momentLink,
  momentLinkRow,
  momentPicture,
} from "./PreviewPage.styles";

export const PREVIEW_PAGE_TITLE = "Interactive preview";
export const PREVIEW_PAGE_DESCRIPTION =
  "Explore how Flump helps you see where you stand each month. Choose a sample household to see the dashboard, try the monthly check-in, or model a change to your savings.";

/** The hero's orbs, biggest first (the approved preview prototype). */
const PREVIEW_HERO_TONES: HeroOrbTones = ["teal", "violet", "sky", "rose"];

const momentArrives = arriveMoment("[data-arrive-item]", 16);

interface PreviewMomentProps {
  id: string;
  title: string;
  text: string;
  tone: "canvas" | "card";
  /** A document picture beside the intro, wide screens only. */
  picture?: ReactNode;
  link: { to: string; label: string };
  children: ReactNode;
}

/**
 * One of the three moments as a band: its heading and line, the production preview in its frame,
 * then its link. The intro, the frame and the picture arrive once; nothing moves inside the frame.
 */
const PreviewMoment: FC<PreviewMomentProps> = ({
  id,
  title,
  text,
  tone,
  picture,
  link,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useGsapMoment(ref, momentArrives);
  return (
    <MarketingBand
      data-testid={`preview-moment-${id}`}
      id={`preview-section-${id}`}
      title={title}
      tone={tone}
    >
      <div className={moment} ref={ref}>
        <div className={momentHead({ picture: Boolean(picture) })}>
          <div className={momentIntro} data-arrive-item="">
            <p>{text}</p>
          </div>
          {picture && (
            <div
              className={momentPicture}
              data-arrive-item=""
              data-testid={`preview-illustration-${id}`}
            >
              {picture}
            </div>
          )}
        </div>
        <div className={momentFrame} data-arrive-item="">
          {children}
        </div>
        <p className={momentLinkRow}>
          <Link className={momentLink} to={link.to}>
            {link.label}
          </Link>
        </p>
      </div>
    </MarketingBand>
  );
};

/**
 * The interactive preview (PR A; the approved preview prototype, 27 Nov 2026, OTHER-PAGES-PLAN
 * slice P2): the hero with still orbs (scene level S0, no script), then the three moments, each a
 * band, then the close with the getting started ticket. By the rules for previews: the frames
 * arrive once and then nothing moves near them, no counting and no chart drawing inside them, and
 * the bands stay solid. One household switch drives all three frames. Strictly fed from
 * @flump/finance-engine over static renter and homeowner fixtures.
 */
export const PreviewPage: FC = () => {
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");

  return (
    <MarketingPageShell>
      <PageMeta description={PREVIEW_PAGE_DESCRIPTION} title={`${PREVIEW_PAGE_TITLE} | Flump`} />

      <Header />

      <main className={mainContent} id="main" tabIndex={-1}>
        <HeroBand
          data-testid="preview-hero"
          lead={PREVIEW_PAGE_DESCRIPTION}
          orbs={<StillHeroOrbs tones={PREVIEW_HERO_TONES} />}
          title={PREVIEW_PAGE_TITLE}
          titleId="preview-title"
        />
        <PreviewMoment
          id="dashboard"
          link={{ to: "/features/accounts", label: "About accounts and net worth" }}
          text="See your net worth, what is left over each month, and your key accounts at a glance. Switch between renting and paying a mortgage to see how the figures change."
          title="Dashboard picture"
          tone="card"
        >
          <PreviewFrame
            household={household}
            id="preview-frame-dashboard"
            onHouseholdChange={setHousehold}
            title="Dashboard"
            titleAs="p"
          >
            <DashboardPreview household={household} id="marketing-dashboard-preview" />
          </PreviewFrame>
        </PreviewMoment>
        <PreviewMoment
          id="checkin"
          link={{ to: "/features/accounts", label: "About accounts and the monthly check-in" }}
          picture={<Illustration palette="orb" scene="check-in" size="sm" variant="document" />}
          text="Spend a couple of minutes once a month updating or confirming your balances. Choose Update or No change to step through each sample account."
          title="Monthly check-in"
          tone="canvas"
        >
          <PreviewFrame
            household={household}
            id="preview-frame-checkin"
            onHouseholdChange={setHousehold}
            title="Check-in"
            titleAs="p"
          >
            <CheckInPreview household={household} id="marketing-checkin-preview" />
          </PreviewFrame>
        </PreviewMoment>
        <PreviewMoment
          id="breathing-room"
          link={{ to: "/features/budget", label: "About budget and breathing room" }}
          text="See how long your savings would cover the essentials. Move the sliders to see what a change in spending or savings would do."
          title="What a change would do"
          tone="card"
        >
          <PreviewFrame
            household={household}
            id="preview-frame-breathing-room"
            onHouseholdChange={setHousehold}
            title="Breathing room"
            titleAs="p"
          >
            <BreathingRoomPreview household={household} id="marketing-breathing-room-preview" />
          </PreviewFrame>
        </PreviewMoment>
        <TicketClose
          text="Flump is free during the beta. Enter a few rough numbers to see where you stand."
          titleId="preview-cta-title"
          tone="canvas"
        />
      </main>

      <Footer />
    </MarketingPageShell>
  );
};
