import {
  BreathingRoomPreview,
  CheckInPreview,
  DashboardPreview,
  PreviewFrame,
  type SampleHouseholdKey,
} from "@repo/ui";
import { type FC, type ReactNode, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { PREVIEW_PAGE_DESCRIPTION, PREVIEW_PAGE_TITLE } from "../../../src/pages/PreviewPage";
import { CheckInPicture } from "../../p11/art/Pictures";
import { usePointerLightAndTilt } from "../../shared/round3";
import { arriveAll, OBand, OHero } from "../blocks";
import { CloseBand } from "../blocks2";
import { ProtoFooter } from "../chrome/ProtoFooter";
import { ProtoHeader } from "../chrome/ProtoHeader";
import { OtherShell } from "../OtherShell";
import { heroLayout, pageLayout } from "../scene/layouts";
import { PageOrbs } from "../scene/SceneLayers";

/*
 * The interactive preview (family D). Production's three moments in order, each a band: its
 * heading and line, then the production preview in its frame, then its link. By the rules for
 * previews: the frames arrive once and then nothing moves near them, no counting and no chart
 * drawing inside them, bubbles only at the edges of the first band, and the bands stay solid at S2.
 * The two flat scenes become document cards: the check-in card beside the check-in (wide screens
 * only, as production), and the getting started ticket in the close. One household switch drives
 * all three frames, as production. Copy: production's, word for word.
 */

const TONES = ["teal", "violet", "sky", "rose"] as const;

const Moment: FC<{
  id: string;
  title: string;
  text: string;
  tone: "canvas" | "card";
  picture?: ReactNode;
  link: { to: string; label: string };
  children: ReactNode;
}> = ({ id, title, text, tone, picture, link, children }) => (
  <OBand
    className="o2-moment-band"
    id={id}
    moment={arriveAll(".o2-moment__intro, .o2-moment__frame, .o2-moment__picture", 16)}
    solid
    title={title}
    tone={tone}
  >
    <div className="o2-moment">
      <div className={`o2-moment__head${picture ? " o2-moment__head--picture" : ""}`}>
        <div className="o2-moment__intro">
          <p>{text}</p>
        </div>
        {picture && <div className="o2-moment__picture">{picture}</div>}
      </div>
      <div className="o2-moment__frame">{children}</div>
      <p className="o2-moment__link">
        <Link to={link.to}>{link.label}</Link>
      </p>
    </div>
  </OBand>
);

const Body: FC = () => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OHero
        ctas={null}
        layout={heroLayout(TONES)}
        lead={PREVIEW_PAGE_DESCRIPTION}
        title={PREVIEW_PAGE_TITLE}
        titleId="preview-title"
      />
      <Moment
        id="preview-section-dashboard"
        link={{ to: "/features/accounts", label: "About accounts and net worth" }}
        text="See your net worth, what is left over each month, and your key accounts at a glance. Switch between renting and paying a mortgage to see how the figures change."
        title="Dashboard picture"
        tone="card"
      >
        <PreviewFrame
          household={household}
          id="o2-preview-frame-dashboard"
          onHouseholdChange={setHousehold}
          title="Dashboard"
          titleAs="p"
        >
          <DashboardPreview household={household} id="o2-dashboard-preview" />
        </PreviewFrame>
      </Moment>
      <Moment
        id="preview-section-checkin"
        link={{ to: "/features/accounts", label: "About accounts and the monthly check-in" }}
        picture={<CheckInPicture decorative />}
        text="Spend a couple of minutes once a month updating or confirming your balances. Choose Update or No change to step through each sample account."
        title="Monthly check-in"
        tone="canvas"
      >
        <PreviewFrame
          household={household}
          id="o2-preview-frame-checkin"
          onHouseholdChange={setHousehold}
          title="Check-in"
          titleAs="p"
        >
          <CheckInPreview household={household} id="o2-checkin-preview" />
        </PreviewFrame>
      </Moment>
      <Moment
        id="preview-section-breathing-room"
        link={{ to: "/features/budget", label: "About budget and breathing room" }}
        text="See how long your savings would cover the essentials. Move the sliders to see what a change in spending or savings would do."
        title="What a change would do"
        tone="card"
      >
        <PreviewFrame
          household={household}
          id="o2-preview-frame-breathing-room"
          onHouseholdChange={setHousehold}
          title="Breathing room"
          titleAs="p"
        >
          <BreathingRoomPreview household={household} id="o2-breathing-room-preview" />
        </PreviewFrame>
      </Moment>
      <CloseBand
        text="Flump is free during the beta. Enter a few rough numbers to see where you stand."
        title="Ready to see your own figures?"
        titleId="preview-cta-title"
        tone="canvas"
      />
    </main>
  );
};

export const PreviewProto: FC = () => (
  <OtherShell defaultLevel="s0" id="preview">
    <PageOrbs layout={pageLayout(TONES)} />
    <ProtoHeader />
    <Body />
    <ProtoFooter />
  </OtherShell>
);
