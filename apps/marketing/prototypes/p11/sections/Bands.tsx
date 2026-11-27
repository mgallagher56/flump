import { Button } from "@repo/ui";
import { type FC, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import { MarketingSection } from "../../../src/components/MarketingSection";
import { bandFooter, bandLink } from "../../../src/pages/HomePage/HomePage.styles";
import {
  AI_CONNECTION,
  AI_CONNECTION_ACCESS,
  FEATURES,
  FEATURES_INDEX,
} from "../../../src/utils/featureAreas";
import { signupCta } from "../../../src/utils/site";
import type { GsapKit } from "../../shared/gsapKit";
import { type PaceState, SCROLL, TIMING, usePace } from "../../shared/pace";
import { Bubbles, SmoothFaq } from "../../shared/round3";
import { areaFor, HOME_DEPTH, ROUGH_FIGURE_STEPS } from "../../shared/sections";
import { TilePicture } from "../art/Pictures";
import { CheckInArt, OnboardingArt, ShieldArt } from "../art/Scenes";
import { FeatureStrip } from "./FeatureStrip";
import { arrive, dealIn, momentScroll } from "./moments";
import { useNearGsap } from "./useNearGsap";

/*
 * Prototype 11's bands after the hero: the features (each with its area's piece), the rough figures steps
 * with the check-in calendar page, More detail and the questions dealing out of one stack, security
 * with its card, and the close with the getting started ticket. Each is a SectionNav stop with one
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
  useNearGsap(ref, (kit, root) => moment(kit, root, pace), [pace.pace]);
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

/**
 * The tiles in view arrive in turn (a short stagger, so none is caught half faded); tiles off to
 * the side of the sideways strip are already at rest. Each piece settles a moment after its tile.
 */
const featuresMoment: Moment = (kit, root, pace) => {
  const grid = root.querySelector(".p11-features");
  if (!grid) return;
  const edge = grid.getBoundingClientRect().right;
  const inView = [...root.querySelectorAll<HTMLElement>(".p11-feature")].filter(
    (tile) => tile.getBoundingClientRect().left < edge - 24,
  );
  arrive(kit, grid, inView, pace, 20);
  kit.gsap.from(inView.map((tile) => tile.querySelector(".p11-tile-pic")).filter(Boolean), {
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
      <FeatureStrip names={FEATURES.map((feature) => feature.name)}>
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
      </FeatureStrip>
      <p className={bandFooter()}>
        <Link className={bandLink()} to={FEATURES_INDEX.path}>
          All Flump features on one page
        </Link>
      </p>
    </MarketingSection>
  </Band>
);

/* ---------- Rough figures: one line runs through the steps; the calendar page arrives ---------- */

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
  // The calendar page rises, the sheet under it settles, then the check-in tag arrives.
  const page = root.querySelector(".p11-r6-page");
  if (!page) return;
  const cal = gsap.timeline({
    scrollTrigger: momentScroll(page, pace, SCROLL.moment * 1.6),
    defaults: { ease: "calm" },
  });
  cal
    .fromTo(page, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0)
    .fromTo(
      root.querySelector(".p11-rough__art .p11-r6-under"),
      { x: 20, opacity: 0 },
      { x: 0, opacity: 0.85, duration: 1 },
      0.2,
    )
    .fromTo(
      root.querySelector(".p11-rough__art .p11-r6-tag"),
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      1.1,
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
        {/* The wrapper holds the picture's full height, so its rows never spill into the next band. */}
        <div className="p11-rough__art">
          <CheckInArt />
        </div>
      </div>
    </MarketingSection>
  </Band>
);

/*
 * ---------- More detail and the questions: dealt in, in order ----------
 * Each list's items arrive in document order with a small rise and fade, once, on a timer (not
 * tied to scroll), so a reader can never stop on a half-dealt, overlapping stack.
 */

const depthMoment: Moment = (kit, root, pace) => {
  const list = root.querySelector<HTMLElement>(".p11-depth");
  if (list) dealIn(kit, list, list.querySelectorAll(".p11-depth__sheet"), pace);
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
            <li className="p11-depth__sheet" data-tilt="" key={item.area}>
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
  if (list) dealIn(kit, list, list.querySelectorAll(".proto-faq__item"), pace);
};

export const Faq: FC = () => (
  <Band bubbles="c" labelledBy="faq-title" moment={faqMoment} name="Questions" tone="canvas">
    <MarketingSection id="faq" title="Frequently asked questions" width="narrow">
      <SmoothFaq />
    </MarketingSection>
  </Band>
);

/*
 * ---------- Security: a card like its neighbours, on the same pale band ----------
 * The picture card and the text arrive once, on a timer, and finish on their own: nothing in this
 * band can rest half faded.
 */

const securityMoment: Moment = ({ gsap }, root, pace) => {
  const row = root.querySelector(".p11-security");
  if (!row) return;
  const tl = gsap.timeline({
    scrollTrigger: { trigger: row, start: "top 86%", once: true },
    defaults: { ease: "calm", duration: pace.s(TIMING.entry) },
  });
  const step = pace.s(TIMING.stagger);
  tl.from(row, { y: 16, opacity: 0 }, 0)
    .from(
      root.querySelectorAll(".p11-pic-sec .p11-rows > div"),
      { y: 8, opacity: 0, stagger: step },
      step * 2,
    )
    .from(root.querySelectorAll(".p11-pic-seal"), { y: 8, opacity: 0 }, step * 4)
    .from(
      root.querySelectorAll(".p11-security__text > *"),
      { y: 12, opacity: 0, stagger: step },
      step,
    );
};

export const Security: FC = () => (
  <Band bubbles="a" labelledBy="security-title" moment={securityMoment} name="Security" tone="card">
    <MarketingSection id="security" labelledBy="security-title" size="compact">
      <div className="p11-security p11-soft-card">
        <ShieldArt />
        <div className="p11-security__text">
          <h2 className="p11-security__title" id="security-title">
            Security and privacy
          </h2>
          <p className="p11-security__body">
            You type in your own figures, so no bank login is needed. Flump has no feature to make
            payments or move money.
          </p>
          <p className="p11-security__more">
            <Link className={bandLink()} to="/security">
              What Flump can and cannot do
            </Link>
          </p>
        </div>
      </div>
    </MarketingSection>
  </Band>
);

/*
 * Close: the getting started ticket rises, then its three parts in turn. Played once on arrival
 * (not scrubbed): this is the last band, so a scrubbed run could stop half done at the page's end.
 */
const closingMoment: Moment = ({ gsap }, root, pace) => {
  const ticket = root.querySelector(".p11-r6-ticket");
  if (!ticket) return;
  const tl = gsap.timeline({
    scrollTrigger: { trigger: ticket, start: "top 88%", once: true },
    defaults: { ease: "calm" },
  });
  tl.from(ticket, { y: 16, opacity: 0, duration: pace.s(TIMING.entry) }, 0).from(
    root.querySelectorAll(".p11-r6-ticket__parts li"),
    { y: 10, opacity: 0, duration: pace.s(TIMING.entry), stagger: pace.s(TIMING.stagger * 2) },
    pace.s(TIMING.stagger * 2),
  );
};

export const Close: FC = () => {
  const cta = signupCta();
  return (
    <Band
      bubbles="b"
      className="p11-close"
      labelledBy="home-cta-title"
      moment={closingMoment}
      name="Get started"
      tone="canvas"
    >
      <MarketingSection id="get-started" labelledBy="home-cta-title" width="narrow">
        <div className="p11-close__card p11-soft-card">
          <OnboardingArt />
          <h2 className="p11-close__title" id="home-cta-title">
            Ready to see where you stand?
          </h2>
          <p className="p11-close__text">Start with a few rough numbers.</p>
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
