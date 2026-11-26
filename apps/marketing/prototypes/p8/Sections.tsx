import { type FC, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import { ClosingCta } from "../../src/components/ClosingCta";
import { MarketingSection } from "../../src/components/MarketingSection";
import { bandLink } from "../../src/pages/HomePage/HomePage.styles";
import { FEATURES_INDEX, MONEY_AREAS } from "../../src/utils/featureAreas";
import { signupCta } from "../../src/utils/site";
import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, usePace } from "../shared/pace";
import { SmoothFaq, unstackMoment } from "../shared/round3";
import { areaFor, HOME_DEPTH, ROUGH_FIGURE_STEPS, SecuritySection } from "../shared/sections";
import { useGsap } from "../shared/useGsap";
import { arrive, scrubFor } from "./calm";
import { PayRise } from "./PayRise";
import { Piece } from "./Pieces";

type Moment = (kit: GsapKit, root: HTMLElement, pace: PaceState) => (() => void) | undefined;

/** A section stop for SectionNav, in normal flow, with one paced GSAP moment scoped to it. */
const Stop: FC<{
  name: string;
  labelledBy: string;
  className?: string;
  moment: Moment;
  children: ReactNode;
}> = ({ name, labelledBy, className = "", moment, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pace = usePace();
  useGsap(ref, (kit, root) => moment(kit, root, pace) ?? undefined, [pace.pace]);
  return (
    // biome-ignore lint/a11y/useSemanticElements: a labelled scroll stop for SectionNav, not a form group.
    <div
      aria-labelledby={labelledBy}
      className={`p8-stop ${className}`}
      role="group"
      data-proto-name={name}
      data-proto-section=""
      ref={ref}
    >
      {children}
    </div>
  );
};

/* ---- Moments ---- */

/** The five areas' tags arrive one after another, like prototype 5's. */
const areasMoment: Moment = (kit, root, pace) => {
  arrive(kit, root.querySelectorAll(".p8-areas__head > *"), pace);
  arrive(kit, root.querySelectorAll(".p8-tag"), pace, 12);
};

/** Rough figures is a sequence: one line runs through it and each step lights as it is reached. */
const stepsMoment: Moment = ({ gsap }, root, pace) => {
  const wrap = root.querySelector(".p8-steps");
  const line = root.querySelector(".p8-steps__line");
  const nodes = root.querySelectorAll(".p8-step__node");
  const steps = root.querySelectorAll(".p8-step");
  if (!wrap || !line) return;
  const across = window.matchMedia("(min-width: 768px)").matches;
  const tl = gsap.timeline({
    scrollTrigger: scrubFor(wrap, pace, 1.4, "top 80%"),
    defaults: { ease: "none" },
  });
  tl.fromTo(line, across ? { scaleX: 0 } : { scaleY: 0 }, { scaleX: 1, scaleY: 1, duration: 3 }, 0);
  nodes.forEach((node, i) => {
    const at = i * 1.25;
    tl.fromTo(node, { "--p8-lit": 0 }, { "--p8-lit": 1, duration: 0.5 }, at).fromTo(
      steps[i] ?? node,
      { opacity: 0.55, x: across ? 0 : 12, y: across ? 12 : 0 },
      { opacity: 1, x: 0, y: 0, duration: 0.9, ease: "calm" },
      at,
    );
  });
};

/** More detail is underneath: the sheets start as one stack and deal out into the list. */
const depthMoment: Moment = (kit, root, pace) => {
  const list = root.querySelector<HTMLElement>(".p8-depth");
  if (list) unstackMoment(kit, list, ".p8-depth__sheet", pace);
};

/** The pay rise card arrives like prototype 5's cards; its two halves follow it in. */
const payMoment: Moment = (kit, root, pace) => {
  arrive(kit, root.querySelectorAll("[data-p8-arrive]"), pace, 20);
  arrive(kit, root.querySelectorAll("[data-p8-pay-part]"), pace, 12);
};

/** Security: the shield settles upright as the strip arrives, then the words and link follow. */
const securityMoment: Moment = (kit, root, pace) => {
  const tile = root.querySelector("h2")?.closest("div")?.previousElementSibling;
  const row = root.querySelector("h2")?.closest("div")?.parentElement;
  if (!tile || !row) return;
  kit.gsap.fromTo(
    tile,
    { rotation: -6, y: 10, scale: 0.96 },
    { rotation: 0, y: 0, scale: 1, ease: "calm", scrollTrigger: scrubFor(row, pace, 1, "top 95%") },
  );
  arrive(
    kit,
    Array.from(row.children).filter((child) => child !== tile),
    pace,
    12,
  );
};

/** Questions: the same stack dealing out as More detail; each answer opens smoothly. */
const faqMoment: Moment = (kit, root, pace) => {
  const list = root.querySelector<HTMLElement>(".proto-faq");
  if (list) unstackMoment(kit, list, ".proto-faq__item", pace);
};

/** The close: the pieces from the hero gather gently into one neat pile beside the button. */
const closingMoment: Moment = ({ gsap }, root, pace) => {
  const deck = root.querySelector(".p8-deck");
  const pieces = root.querySelectorAll(".p8-deck__piece");
  if (!deck) return;
  gsap.fromTo(
    pieces,
    {
      x: (i: number) => [-70, 64, -56, 56, -30, 34][i] ?? 0,
      y: (i: number) => [-30, -26, 22, 26, -36, 32][i] ?? 0,
      rotationZ: (i: number) => [-6, 5, -4, 6, -5, 4][i] ?? 0,
      opacity: 0.4,
    },
    {
      x: 0,
      y: 0,
      rotationZ: 0,
      opacity: 1,
      ease: "calm",
      stagger: 0.1,
      scrollTrigger: scrubFor(deck, pace, 1.3, "top 98%"),
    },
  );
  // 1b's pointer light on the closing button too (ClosingCta is the real component).
  const button = root.querySelector<HTMLElement>("a[href]");
  button?.setAttribute("data-light", "");
  return () => button?.removeAttribute("data-light");
};

/* ---- Sections ---- */

/**
 * The five areas, named: a short band whose tags link to each scene below. This is where the
 * hero's scroll cue lands.
 */
const AreasIntro: FC = () => (
  <Stop className="p8-areas" labelledBy="areas-title" moment={areasMoment} name="Five areas">
    <section aria-labelledby="areas-title" className="p8-areas__band" id="areas">
      <div className="p8-areas__inner">
        <div className="p8-areas__head">
          <h2 className="p8-areas__title" id="areas-title">
            {FEATURES_INDEX.title}
          </h2>
          <p className="p8-areas__lead">The same five areas as the app. Use one or all five.</p>
        </div>
        <ul aria-label="The five areas" className="p8-tags">
          {MONEY_AREAS.map((area) => (
            <li className="p8-tag" key={area.key}>
              <a data-light="" href={`#p8-${area.key}`}>
                {area.name}
              </a>
            </li>
          ))}
        </ul>
        <p className="p8-areas__more">
          <Link className={bandLink()} to={FEATURES_INDEX.path}>
            All Flump features on one page
          </Link>
        </p>
      </div>
    </section>
  </Stop>
);

const StepsSection: FC = () => (
  <Stop labelledBy="rough-figures-title" moment={stepsMoment} name="Rough figures">
    <MarketingSection id="rough-figures" title="Start with rough figures">
      <div className="p8-steps">
        <span aria-hidden="true" className="p8-steps__track">
          <span className="p8-steps__line" />
        </span>
        <ol className="p8-steps__list">
          {ROUGH_FIGURE_STEPS.map((step, index) => (
            <li aria-labelledby={`p8-step-${step.id}`} className="p8-step" key={step.id}>
              <span aria-hidden="true" className="p8-step__node tabular-nums">
                {index + 1}
              </span>
              <h3 className="p8-step__title" id={`p8-step-${step.id}`}>
                {step.title}
              </h3>
              <p className="p8-step__body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </MarketingSection>
  </Stop>
);

const DepthSection: FC = () => (
  <Stop labelledBy="more-detail-title" moment={depthMoment} name="More detail">
    <MarketingSection
      id="more-detail"
      subtitle="Each area starts simple and has more underneath for when you want it."
      title="More detail when you want it"
      tone="card"
    >
      <ul className="p8-depth">
        {HOME_DEPTH.map((item) => {
          const area = areaFor(item.area);
          return (
            <li className="p8-depth__sheet" key={item.area}>
              <span className="p8-depth__text">{item.text}</span>
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
  </Stop>
);

const MiniDeck: FC = () => (
  <div aria-hidden="true" className="p8-deck">
    {(["statement", "payslip", "receipt", "pension", "credit", "card"] as const).map((k) => (
      <Piece className="p8-piece--mini p8-deck__piece" k={k} key={k} />
    ))}
  </div>
);

/** The areas' band, before the five scenes. */
export const P8AreasIntro = AreasIntro;

/** Everything after the five scenes: compact bands, each with one calm moment. */
export const P8Rest: FC = () => {
  const cta = signupCta();
  return (
    <>
      <StepsSection />
      <DepthSection />
      <Stop labelledBy="pay-rise-title" moment={payMoment} name="Pay rise">
        <PayRise />
      </Stop>
      <Stop labelledBy="security-title" moment={securityMoment} name="Security">
        <SecuritySection />
      </Stop>
      <Stop labelledBy="faq-title" moment={faqMoment} name="Questions">
        <MarketingSection id="faq" title="Frequently asked questions" tone="card" width="narrow">
          <SmoothFaq />
        </MarketingSection>
      </Stop>
      <Stop labelledBy="home-cta-title" moment={closingMoment} name="Get started">
        <ClosingCta
          cta={cta}
          id="get-started"
          illustration={<MiniDeck />}
          text="Start with a few rough numbers."
          title="Ready to see where you stand?"
          titleId="home-cta-title"
        />
      </Stop>
    </>
  );
};
