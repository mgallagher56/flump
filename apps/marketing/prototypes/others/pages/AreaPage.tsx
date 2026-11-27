import {
  Button,
  DebtBorrowingPreview,
  DebtHelpLink,
  PreviewFrame,
  type SampleHouseholdKey,
} from "@repo/ui";
import { type FC, useRef, useState } from "react";
import { Footer } from "../../../src/components/Footer";
import { Header } from "../../../src/components/Header";
import { TryItSection } from "../../../src/components/TryItSection";
import { mainContent } from "../../../src/pages/HomePage/HomePage.styles";
import { MONEY_AREAS, type MoneyAreaKey } from "../../../src/utils/featureAreas";
import { signupCta } from "../../../src/utils/site";
import { GlassOrb } from "../../p11/art/GlassOrb";
import { OnboardingPicture } from "../../p11/art/Pictures";
import { LitCtas } from "../../p11/hero/LitCtas";
import { type OrbToneName, STOP_ORB_TONES } from "../../p11/journeyTypes";
import { dealIn } from "../../p11/sections/moments";
import { TIMING } from "../../shared/pace";
import { usePointerLightAndTilt } from "../../shared/round3";
import { arriveAll, both, type Moment, OBand, OHero } from "../blocks";
import { type OtherPageId, OtherShell } from "../OtherShell";
import { heroLayout, pageLayout } from "../scene/layouts";
import { PageOrbs } from "../scene/SceneLayers";
import { SetPiece, setPieceMoment } from "../setPiece";

/*
 * The area page template (family B), shown for Pay and for Debt and borrowing. Production's
 * FeaturePage sections in order, each a band in prototype 11's language:
 *
 * hero with the scene; "What you see" as glass cards beside the area's set piece from the journey
 * (the payslip unfolding, the debt running down), played once on arrival; the interactive sample
 * where the area has one, kept still and solid; "More detail" dealt in; "Part of one picture" as
 * five glass pills with small orbs; "Try it" exactly as production, still and solid; the close with
 * the getting started ticket.
 *
 * Colour: each area keeps its journey colours (Pay teal with rose, Debt violet with teal). Debt is
 * never rose and its chart line is plain violet ink, as in prototype 11; nothing says good or bad.
 *
 * Copy: from production's `utils/featureAreas` and, where FeaturePage writes a line inline, the
 * same words copied here (noted beside each).
 */

/** Each area's four orb colours for the hero: its own two journey colours first, both sets mixed. */
const AREA_TONES: Record<
  "pay" | "debt-and-borrowing",
  readonly [OrbToneName, OrbToneName, OrbToneName, OrbToneName]
> = {
  pay: ["teal", "rose", "sky", "violet"],
  // Never rose on the debt page.
  "debt-and-borrowing": ["violet", "teal", "sky", "teal"],
};

const area = (key: MoneyAreaKey) => {
  const found = MONEY_AREAS.find((a) => a.key === key);
  if (!found) throw new Error(`Unknown area ${key}`);
  return found;
};

/* ---------- What you see: facts beside the set piece ---------- */

const WhatYouSee: FC<{ areaKey: "pay" | "debt-and-borrowing" }> = ({ areaKey }) => {
  const feature = area(areaKey);
  return (
    <OBand
      bubbles="a"
      id="what-you-see"
      moment={both(arriveAll(".o1-fact", 16), setPieceMoment(areaKey))}
      title="What you see"
      tone="card"
    >
      <div className="o1-split">
        <div className="o1-facts-col">
          <ul className="o1-facts">
            {feature.facts.map((fact) => (
              <li className="o1-fact p11-soft-card" data-tilt="" key={fact}>
                <p>{fact}</p>
              </li>
            ))}
          </ul>
          {areaKey === "debt-and-borrowing" && (
            <div className="o1-fact-footer">
              <DebtHelpLink />
            </div>
          )}
        </div>
        <SetPiece stopKey={areaKey} />
      </div>
    </OBand>
  );
};

/* ---------- The interactive sample (debt only): still, solid, no decoration ---------- */

const SampleBand: FC = () => {
  const [household, setHousehold] = useState<SampleHouseholdKey>("renter");
  return (
    // Production's words (FeaturePage SampleSection).
    <OBand
      id="see-it"
      solid
      subtitle="Sample figures for an example household. Switch between renting and paying a mortgage."
      title="See it with sample figures"
      tone="canvas"
    >
      <PreviewFrame
        household={household}
        id="o1-feature-frame-debt"
        onHouseholdChange={setHousehold}
        title="Debt and borrowing"
        titleAs="p"
      >
        <DebtBorrowingPreview household={household} id="o1-feature-debt-preview" />
      </PreviewFrame>
    </OBand>
  );
};

/* ---------- More detail: the deeper tools, dealt in ---------- */

const moreMoment: Moment = (kit, root, pace) => {
  dealIn(kit, root, root.querySelectorAll(".o1-depth li"), pace);
};

const MoreDetail: FC<{ areaKey: MoneyAreaKey; tone: "canvas" | "card"; dot: OrbToneName }> = ({
  areaKey,
  tone,
  dot,
}) => (
  <OBand
    bubbles="c"
    id="more-detail"
    moment={moreMoment}
    title="More detail when you want it"
    tone={tone}
  >
    <ul className="o1-depth">
      {area(areaKey).depth.map((item) => (
        <li className="p11-soft-card" key={item}>
          <GlassOrb className="o1-depth__dot" size={18} tone={dot} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </OBand>
);

/* ---------- Part of one picture: five pills, each with its area's orb ---------- */

const OnePicture: FC<{ current: MoneyAreaKey; tone: "canvas" | "card" }> = ({ current, tone }) => (
  // Production's words (FeaturePage).
  <OBand
    id="one-picture"
    moment={arriveAll(".o1-pill", 12)}
    subtitle="Use one area or all five. Together they make one picture of your money, on your Home page."
    title="Part of one picture"
    tone={tone}
  >
    <ul className="o1-pills">
      {MONEY_AREAS.map((a) => {
        const here = a.key === current;
        return (
          <li className="o1-pill" key={a.key}>
            <a
              aria-current={here ? "page" : undefined}
              className="o1-pill__link"
              data-light=""
              data-current={here}
              href={a.path}
            >
              <GlassOrb size={26} tone={STOP_ORB_TONES[a.key][0]} />
              <span>{a.name}</span>
              {here && <span className="o1-pill__here">You are here</span>}
            </a>
          </li>
        );
      })}
    </ul>
  </OBand>
);

/* ---------- Close: the getting started ticket ---------- */

const closeMoment: Moment = ({ gsap }, root, pace) => {
  const ticket = root.querySelector(".p11-r6-ticket");
  if (!ticket) return;
  gsap
    .timeline({
      scrollTrigger: { trigger: ticket, start: "top 88%", once: true },
      defaults: { ease: "calm" },
    })
    .from(ticket, { y: 16, opacity: 0, duration: pace.s(TIMING.entry) }, 0)
    .from(
      root.querySelectorAll(".p11-r6-ticket__parts li"),
      { y: 10, opacity: 0, duration: pace.s(TIMING.entry), stagger: pace.s(TIMING.stagger * 2) },
      pace.s(TIMING.stagger * 2),
    );
};

const Close: FC<{ tone: "canvas" | "card" }> = ({ tone }) => {
  const cta = signupCta();
  return (
    <OBand
      bubbles="b"
      id="get-started"
      labelledBy="feature-cta-title"
      moment={closeMoment}
      tone={tone}
      width="narrow"
    >
      <div className="o1-close p11-soft-card">
        <OnboardingPicture decorative />
        {/* Production's words (FeaturePage ClosingCta). */}
        <h2 className="o1-close__title" id="feature-cta-title">
          Ready to see your own figures?
        </h2>
        <p className="o1-close__text">Start with a few rough figures.</p>
        <Button asChild size="lg" variant="primary">
          <a data-light="" href={cta.href}>
            {cta.label}
          </a>
        </Button>
      </div>
    </OBand>
  );
};

/* ---------- The page ---------- */

const Body: FC<{ areaKey: "pay" | "debt-and-borrowing" }> = ({ areaKey }) => {
  const ref = useRef<HTMLElement>(null);
  usePointerLightAndTilt(ref, 6);
  const feature = area(areaKey);
  const hasSample = areaKey === "debt-and-borrowing";
  // Tones alternate after the canvas hero, as production's FeaturePage; Try it is production's own
  // canvas band, so the close after it is always card.
  const [t1, t2] = hasSample ? (["card", "canvas"] as const) : (["canvas", "card"] as const);
  return (
    <main className={mainContent()} id="main" ref={ref} tabIndex={-1}>
      <OHero
        ctas={<LitCtas secondary={Boolean(feature.previewHref)} />}
        label={feature.name}
        layout={heroLayout(AREA_TONES[areaKey])}
        lead={feature.lead}
        title={feature.h1}
        titleId={`${feature.key}-title`}
      />
      <WhatYouSee areaKey={areaKey} />
      {hasSample && <SampleBand />}
      <MoreDetail areaKey={areaKey} dot={AREA_TONES[areaKey][0]} tone={t1} />
      <OnePicture current={areaKey} tone={t2} />
      <div className="o1-solid-wrap">
        <TryItSection area={areaKey} />
      </div>
      <Close tone="card" />
    </main>
  );
};

const AreaProto: FC<{ id: OtherPageId; areaKey: "pay" | "debt-and-borrowing" }> = ({
  id,
  areaKey,
}) => (
  <OtherShell defaultLevel="s1" id={id}>
    <PageOrbs layout={pageLayout(AREA_TONES[areaKey])} />
    <Header />
    <Body areaKey={areaKey} />
    <Footer />
  </OtherShell>
);

export const PayProto: FC = () => <AreaProto areaKey="pay" id="pay" />;
export const DebtProto: FC = () => <AreaProto areaKey="debt-and-borrowing" id="debt" />;
