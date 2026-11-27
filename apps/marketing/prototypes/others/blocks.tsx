import { type FC, type ReactNode, useRef } from "react";
import { MarketingSection } from "../../src/components/MarketingSection";
import { heroHeading, heroLead } from "../../src/pages/HomePage/HomePage.styles";
import { LitCtas } from "../p11/hero/LitCtas";
import { arrive } from "../p11/sections/moments";
import { useNearGsap } from "../p11/sections/useNearGsap";
import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, usePace } from "../shared/pace";
import type { OrbLayout } from "./scene/orbScene";
import { BandBubbles, HeroOrbs } from "./scene/SceneLayers";
import { PauseControl, useScene } from "./scene/sceneLevel";
import "../p11/page.css";

/*
 * Prototype 11's building blocks, put together for pages other than home. No SectionNav stops, no
 * changeover, no receding scene and no pinning (plan section 3): each band has one paced moment that
 * plays once on time, and every band is finished and still with reduced motion.
 */

export type Moment = (kit: GsapKit, root: HTMLElement, pace: PaceState) => void;

/**
 * One band in normal flow, like prototype 11's Band without its SectionNav stop: production's
 * MarketingSection inside (so headings and spacing match the live site), a tone, an optional bubble
 * field at its edges, and one paced moment.
 */
export const OBand: FC<{
  id: string;
  title?: string;
  subtitle?: string;
  /** The heading id when the title is not the section's own (a card's heading inside). */
  labelledBy?: string;
  tone: "canvas" | "card";
  bubbles?: "a" | "b" | "c";
  moment?: Moment;
  width?: "wide" | "narrow";
  /** Interactive previews keep a solid band even at S2, so nothing moves behind them. */
  solid?: boolean;
  className?: string;
  children: ReactNode;
}> = ({
  id,
  title,
  subtitle,
  labelledBy,
  tone,
  bubbles,
  moment,
  width,
  solid = false,
  className = "",
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const pace = usePace();
  useNearGsap(
    ref,
    (kit, root) => {
      moment?.(kit, root, pace);
    },
    [pace.pace],
  );
  return (
    <div
      className={`p11-band o1-band p11-tone--${tone} ${solid ? "o1-band--solid" : ""} ${className}`}
      ref={ref}
    >
      {bubbles && <BandBubbles layout={bubbles} />}
      <MarketingSection
        id={id}
        labelledBy={labelledBy}
        subtitle={subtitle}
        title={title}
        tone={tone}
        width={width}
      >
        {children}
      </MarketingSection>
    </div>
  );
};

/** At S1 the only ambient motion is this band's scene, so its pause control sits here. */
const HeroPause: FC = () => (useScene().level === "s1" ? <PauseControl inline /> : null);

/**
 * The first band: copy on the left (a small label, the h1, the lead, optional extra lines, the
 * calls to action) and the scene on the right; on phones the orbs sit on a shelf below the buttons.
 * The copy itself never moves: it is the page's largest text and must be there at first paint.
 */
export const OHero: FC<{
  titleId: string;
  label?: string;
  title: string;
  lead: string;
  children?: ReactNode;
  ctas?: ReactNode;
  layout: OrbLayout;
}> = ({ titleId, label, title, lead, children, ctas = <LitCtas />, layout }) => (
  <section aria-labelledby={titleId} className="o1-band o1-hero p11-tone--canvas">
    <HeroOrbs layout={layout} />
    <div className="o1-hero__inner">
      <div className="o1-hero__copy">
        {label && <p className="o1-hero__label">{label}</p>}
        <h1 className={`${heroHeading()} o1-hero__title`} id={titleId}>
          {title}
        </h1>
        <p className={`${heroLead()} o1-hero__lead`}>{lead}</p>
        {children}
        {ctas && <div className="o1-hero__ctas">{ctas}</div>}
        <HeroPause />
      </div>
    </div>
  </section>
);

/** Cards, tags and lines in a band arrive in turn when the band comes into view (prototype 5). */
export const arriveAll =
  (selector: string, distance = 16): Moment =>
  (kit, root, pace) => {
    arrive(kit, root, root.querySelectorAll(selector), pace, distance);
  };

/** Two moments in one band. */
export const both =
  (...moments: Moment[]): Moment =>
  (kit, root, pace) => {
    for (const moment of moments) moment(kit, root, pace);
  };
