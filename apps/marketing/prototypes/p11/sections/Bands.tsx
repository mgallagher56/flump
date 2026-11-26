import { Button } from "@repo/ui";
import { type FC, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import {
  closingCtaBody,
  closingCtaScene,
  closingCtaText,
  closingCtaTitle,
} from "../../../src/components/ClosingCta/ClosingCta.styles";
import { MarketingSection } from "../../../src/components/MarketingSection";
import {
  stripBody,
  stripLink,
  stripText,
  stripTitle,
} from "../../../src/components/SecurityPrivacySection/SecurityPrivacySection.styles";
import { bandFooter, bandLink } from "../../../src/pages/HomePage/HomePage.styles";
import {
  AI_CONNECTION,
  AI_CONNECTION_ACCESS,
  FEATURES,
  FEATURES_INDEX,
} from "../../../src/utils/featureAreas";
import { signupCta } from "../../../src/utils/site";
import type { GsapKit } from "../../shared/gsapKit";
import { type PaceState, SCROLL, usePace } from "../../shared/pace";
import { Bubbles, SmoothFaq, unstackMoment } from "../../shared/round3";
import { areaFor, HOME_DEPTH, ROUGH_FIGURE_STEPS } from "../../shared/sections";
import { useGsap } from "../../shared/useGsap";
import { TilePicture } from "../art/Pictures";
import { CheckInArt, OnboardingArt, ShieldArt } from "../art/Scenes";
import { arrive, momentScroll } from "./moments";

/*
 * Prototype 11's bands after the hero: the features (each with its area's piece), the rough figures steps
 * with the check-in calendar, More detail and the questions dealing out of one stack, security
 * with the glass shield, and the close with the glass steps. Each is a SectionNav stop with one
 * paced moment; tones alternate; bubbles in both sets sit at the edges of a few.
 */

type Moment = (kit: GsapKit, root: HTMLElement, pace: PaceState) => void;

/** A SectionNav stop around one band, in normal flow, with bubbles and one paced moment. */
export const Band: FC<{
  name: string;
  labelledBy: string;
  tone: "canvas" | "card" | "hero" | "contrast";
  bubbles?: "a" | "b" | "c";
  moment: Moment;
  className?: string;
  children: ReactNode;
}> = ({ name, labelledBy, tone, bubbles, moment, className = "", children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pace = usePace();
  useGsap(ref, (kit, root) => moment(kit, root, pace), [pace.pace]);
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: SectionNav reads the label to find each stop's heading; the section inside carries the landmark.
    <div
      aria-labelledby={labelledBy}
      className={`p11-band p11-tone--${tone} ${className}`}
      data-proto-name={name}
      data-proto-section=""
      ref={ref}
    >
      {bubbles && <Bubbles layout={bubbles} />}
      {children}
    </div>
  );
};

/* ---------- Features: one tile per area, each with its piece ---------- */

/** The tiles arrive in turn; each piece settles a moment after its tile. */
const featuresMoment: Moment = (kit, root, pace) => {
  const grid = root.querySelector(".p11-features");
  if (!grid) return;
  arrive(kit, grid, root.querySelectorAll(".p11-feature"), pace, 20);
  kit.gsap.from(root.querySelectorAll(".p11-tile-pic"), {
    y: 10,
    opacity: 0,
    duration: pace.s(1100),
    stagger: pace.s(140),
    delay: pace.s(300),
    ease: "calm",
    scrollTrigger: { trigger: grid, start: "top 86%", once: true },
  });
};

export const Features: FC = () => (
  <Band
    bubbles="b"
    labelledBy="features-title"
    moment={featuresMoment}
    name="Five areas"
    tone="card"
  >
    <MarketingSection
      id="features"
      subtitle="The same five areas as the app. Use one or all five."
      title={FEATURES_INDEX.title}
    >
      <ul aria-label="Flump features" className="p11-features">
        {FEATURES.map((feature) => {
          const isAi = feature.key === AI_CONNECTION.key;
          return (
            <li className="p11-feature" key={feature.key}>
              <div className="p11-feature__card" data-tilt="">
                <TilePicture area={feature.key} />
                <h3 className="p11-feature__name">
                  <Link className="p11-feature__link" to={feature.path}>
                    {feature.name}
                  </Link>
                </h3>
                <p className="p11-feature__text">{isAi ? feature.menuDescription : feature.lead}</p>
                {isAi && <p className="p11-feature__note">{AI_CONNECTION_ACCESS}</p>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className={bandFooter()}>
        <Link className={bandLink()} to={FEATURES_INDEX.path}>
          All Flump features on one page
        </Link>
      </p>
    </MarketingSection>
  </Band>
);

/* ---------- Rough figures: one line runs through the steps; the calendar fills in ---------- */

const stepsMoment: Moment = ({ gsap }, root, pace) => {
  const wrap = root.querySelector(".p11-steps");
  const line = root.querySelector(".p11-steps__line");
  const nodes = root.querySelectorAll(".p11-step__node");
  const steps = root.querySelectorAll(".p11-step");
  if (!wrap || !line) return;
  const tl = gsap.timeline({
    scrollTrigger: momentScroll(wrap, pace, SCROLL.moment * 1.4),
    defaults: { ease: "none" },
  });
  tl.fromTo(line, { scaleY: 0 }, { scaleY: 1, duration: 3 }, 0);
  nodes.forEach((node, i) => {
    const at = i * 1.1;
    tl.fromTo(node, { "--lit": 0 }, { "--lit": 1, duration: 0.5 }, at).fromTo(
      steps[i] ?? node,
      { x: 12 },
      { x: 0, duration: 0.9, ease: "calm" },
      at,
    );
  });
  // The calendar: the card rises, the days come in along the weeks, the orb settles on today,
  // then each balance is ticked.
  const card = root.querySelector(".p11-art-checkin__card");
  if (!card) return;
  const cal = gsap.timeline({
    scrollTrigger: momentScroll(card, pace, SCROLL.moment * 1.6),
    defaults: { ease: "calm" },
  });
  cal
    .fromTo(card, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0)
    .fromTo(
      root.querySelector(".p11-pic-cal__behind"),
      { x: 20, opacity: 0 },
      { x: 0, opacity: 0.9, duration: 1 },
      0.2,
    )
    .fromTo(
      root.querySelectorAll(".p11-art-checkin__day"),
      { opacity: 0, y: 6 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.035 },
      0.3,
    )
    .fromTo(
      root.querySelector(".p11-art-checkin__day[data-today]"),
      { opacity: 0.3 },
      { opacity: 1, duration: 0.6 },
      1.4,
    )
    .fromTo(
      root.querySelectorAll(".p11-art-checkin__row"),
      { opacity: 0, x: 10 },
      { opacity: 1, x: 0, duration: 0.6, stagger: 0.2 },
      2,
    )
    .fromTo(
      root.querySelectorAll(".p11-art-checkin__tick"),
      { scale: 0.96, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, stagger: 0.2 },
      2.2,
    );
};

export const RoughFigures: FC = () => (
  <Band
    labelledBy="rough-figures-title"
    moment={stepsMoment}
    name="Rough figures"
    tone="card"
    bubbles="a"
  >
    <MarketingSection id="rough-figures" title="Start with rough figures">
      <div className="p11-rough">
        <div className="p11-steps">
          <span aria-hidden="true" className="p11-steps__track">
            <span className="p11-steps__line" />
          </span>
          <ol className="p11-steps__list">
            {ROUGH_FIGURE_STEPS.map((step, index) => (
              <li aria-labelledby={`p11-step-${step.id}`} className="p11-step" key={step.id}>
                <span aria-hidden="true" className="p11-step__node tabular-nums">
                  {index + 1}
                </span>
                <h3 className="p11-step__title" id={`p11-step-${step.id}`}>
                  {step.title}
                </h3>
                <p className="p11-step__body">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <CheckInArt />
      </div>
    </MarketingSection>
  </Band>
);

/* ---------- More detail and the questions: one stack dealing out ---------- */

const depthMoment: Moment = (kit, root, pace) => {
  const list = root.querySelector<HTMLElement>(".p11-depth");
  if (list) unstackMoment(kit, list, ".p11-depth__sheet", pace);
};

export const MoreDetail: FC = () => (
  <Band
    bubbles="b"
    labelledBy="more-detail-title"
    moment={depthMoment}
    name="More detail"
    tone="card"
  >
    <MarketingSection
      id="more-detail"
      subtitle="Each area starts simple and has more underneath for when you want it."
      title="More detail when you want it"
    >
      <ul className="p11-depth">
        {HOME_DEPTH.map((item) => {
          const area = areaFor(item.area);
          return (
            <li className="p11-depth__sheet" key={item.area}>
              <span className="p11-depth__text">{item.text}</span>
              {area && (
                <Link className={bandLink()} to={area.path}>
                  About {area.name.toLowerCase()} in Flump
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </MarketingSection>
  </Band>
);

const faqMoment: Moment = (kit, root, pace) => {
  const list = root.querySelector<HTMLElement>(".proto-faq");
  if (list) unstackMoment(kit, list, ".proto-faq__item", pace);
};

export const Faq: FC = () => (
  <Band bubbles="c" labelledBy="faq-title" moment={faqMoment} name="Questions" tone="canvas">
    <MarketingSection id="faq" title="Frequently asked questions" width="narrow">
      <SmoothFaq />
    </MarketingSection>
  </Band>
);

/* ---------- Security: the card settles, its lines come in, then the seal ---------- */

const securityMoment: Moment = ({ gsap }, root, pace) => {
  const row = root.querySelector(".p11-security");
  if (!row) return;
  const tl = gsap.timeline({
    scrollTrigger: momentScroll(row, pace, SCROLL.moment * 1.2),
    defaults: { ease: "calm" },
  });
  tl.fromTo(".p11-pic-sec", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0)
    .fromTo(
      ".p11-pic-sec .p11-rows > div",
      { x: 10, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, stagger: 0.15 },
      0.4,
    )
    .fromTo(".p11-pic-seal", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.9)
    .fromTo(
      ".p11-security__text > *",
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.12 },
      0.3,
    );
};

export const Security: FC = () => (
  <Band labelledBy="security-title" moment={securityMoment} name="Security" tone="hero">
    <MarketingSection id="security" labelledBy="security-title" size="compact" tone="hero">
      <div className="p11-security">
        <ShieldArt />
        <div className={`${stripText()} p11-security__text`}>
          <h2 className={stripTitle()} id="security-title">
            Security and privacy
          </h2>
          <p className={stripBody()}>
            You type in your own figures, so no bank login is needed. Flump has no feature to make
            payments or move money.
          </p>
          <p className="p11-security__more">
            <Link className={stripLink()} to="/security">
              What Flump can and cannot do
            </Link>
          </p>
        </div>
      </div>
    </MarketingSection>
  </Band>
);

/* ---------- Close: the paper steps rise in turn, then the sprout on the tallest ---------- */

const closingMoment: Moment = ({ gsap }, root, pace) => {
  const art = root.querySelector(".p11-art-steps");
  if (!art) return;
  const tl = gsap.timeline({
    scrollTrigger: { ...momentScroll(art, pace, SCROLL.moment * 1.4), start: "top 95%" },
    defaults: { ease: "calm" },
  });
  tl.fromTo(
    root.querySelectorAll(".p11-art-steps__step"),
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.9, stagger: 0.3 },
    0,
  )
    .fromTo(
      root.querySelector(".p11-art-steps__sprout"),
      { y: 10, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9 },
      0.9,
    )
    .fromTo(
      root.querySelector(".p11-pic__arc"),
      { opacity: 0 },
      { opacity: 1, duration: 0.8 },
      0.6,
    );
};

export const Close: FC = () => {
  const cta = signupCta();
  return (
    <Band labelledBy="home-cta-title" moment={closingMoment} name="Get started" tone="contrast">
      <MarketingSection id="get-started" labelledBy="home-cta-title" tone="contrast" width="narrow">
        <div className={closingCtaBody()}>
          <div className={closingCtaScene()} data-theme="dark">
            <OnboardingArt />
          </div>
          <h2 className={closingCtaTitle()} id="home-cta-title">
            Ready to see where you stand?
          </h2>
          <p className={closingCtaText()}>Start with a few rough numbers.</p>
          <Button asChild size="lg" variant="primary">
            <a data-light="" href={cta.href}>
              {cta.label}
            </a>
          </Button>
        </div>
      </MarketingSection>
    </Band>
  );
};
