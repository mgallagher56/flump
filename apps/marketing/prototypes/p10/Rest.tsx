import { Button } from "@repo/ui";
import { type FC, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import {
  closingCtaBody,
  closingCtaScene,
  closingCtaText,
  closingCtaTitle,
} from "../../src/components/ClosingCta/ClosingCta.styles";
import { MarketingSection } from "../../src/components/MarketingSection";
import { bandLink } from "../../src/pages/HomePage/HomePage.styles";
import { signupCta } from "../../src/utils/site";
import type { GsapKit } from "../shared/gsapKit";
import { type PaceState, SCROLL, usePace } from "../shared/pace";
import { Bubbles, SmoothFaq, unstackMoment } from "../shared/round3";
import { areaFor, HOME_DEPTH } from "../shared/sections";
import { useGsap } from "../shared/useGsap";
import { momentScroll } from "./moments";
import { Piece } from "./Pieces";

/**
 * A SectionNav stop around one band, in normal flow, with a bubble backdrop and one paced GSAP
 * moment scoped to it.
 */
const Band: FC<{
  name: string;
  labelledBy: string;
  tone: "canvas" | "card" | "contrast";
  bubbles?: "a" | "b" | "c";
  moment: (kit: GsapKit, root: HTMLElement, pace: PaceState) => void;
  children: ReactNode;
}> = ({ name, labelledBy, tone, bubbles, moment, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pace = usePace();
  useGsap(ref, (kit, root) => moment(kit, root, pace), [pace.pace]);
  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: SectionNav reads the label to find each stop's heading; the section inside carries the landmark.
    <div
      aria-labelledby={labelledBy}
      className={`p10-band p10-tone--${tone}`}
      data-proto-name={name}
      data-proto-section=""
      ref={ref}
    >
      {bubbles && <Bubbles layout={bubbles} />}
      {children}
    </div>
  );
};

/** More detail is underneath: the sheets start as one stack and deal out into the list. */
const depthMoment = (kit: GsapKit, root: HTMLElement, pace: PaceState) => {
  const list = root.querySelector<HTMLElement>(".p10-depth");
  if (list) unstackMoment(kit, list, ".p10-depth__sheet", pace);
};

/** The questions deal out of one stack in the same way, then open and close smoothly. */
const faqMoment = (kit: GsapKit, root: HTMLElement, pace: PaceState) => {
  const list = root.querySelector<HTMLElement>(".proto-faq");
  if (list) unstackMoment(kit, list, ".proto-faq__item", pace);
};

/** The close: the hero's pieces gather, slowly, into one neat pile above the button. */
const closingMoment = ({ gsap }: GsapKit, root: HTMLElement, pace: PaceState) => {
  const deck = root.querySelector(".p10-deck");
  const pieces = root.querySelectorAll(".p10-deck__piece");
  if (!deck) return;
  gsap.fromTo(
    pieces,
    {
      x: (i: number) => [-70, 64, -52, 56, -28, 34][i] ?? 0,
      y: (i: number) => [-24, -20, 18, 22, -30, 26][i] ?? 0,
      rotationZ: (i: number) => [-6, 5, -4, 6, -5, 4][i] ?? 0,
      opacity: 0,
    },
    {
      x: 0,
      y: 0,
      rotationZ: 0,
      opacity: 1,
      ease: "calm",
      stagger: 0.1,
      scrollTrigger: { ...momentScroll(deck, pace, SCROLL.moment), start: "top 96%" },
    },
  );
};

const MiniDeck: FC = () => (
  <div aria-hidden="true" className="p10-deck">
    {(["statement", "payslip", "receipt", "pension", "credit", "card"] as const).map((k) => (
      <Piece className="p10-piece--mini p10-deck__piece" k={k} key={k} />
    ))}
  </div>
);

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
      <ul className="p10-depth">
        {HOME_DEPTH.map((item) => {
          const area = areaFor(item.area);
          return (
            <li className="p10-depth__sheet" key={item.area}>
              <span className="p10-depth__text">{item.text}</span>
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

export const Faq: FC = () => (
  <Band bubbles="c" labelledBy="faq-title" moment={faqMoment} name="Questions" tone="canvas">
    <MarketingSection id="faq" title="Frequently asked questions" width="narrow">
      <SmoothFaq />
    </MarketingSection>
  </Band>
);

export const Close: FC = () => {
  const cta = signupCta();
  return (
    <Band labelledBy="home-cta-title" moment={closingMoment} name="Get started" tone="contrast">
      <MarketingSection id="get-started" labelledBy="home-cta-title" tone="contrast" width="narrow">
        <div className={closingCtaBody()}>
          <div className={closingCtaScene()} data-theme="dark">
            <MiniDeck />
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
