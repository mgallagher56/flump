import { Illustration } from "@repo/ui";
import { type FC, useRef } from "react";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { MarketingBand } from "../MarketingBand";
import {
  roughLayout,
  roughPicture,
  step,
  stepBody,
  stepList,
  stepNode,
  steps,
  stepsLine,
  stepsTrack,
  stepTitle,
} from "./HomeRoughFigures.styles";

/** "Start with rough figures" (E42 S5): what the reader does, in three steps. */
export const ROUGH_FIGURE_STEPS = [
  {
    id: "enter",
    title: "Enter rough figures",
    body: "Type in rough totals for what you own, what you owe, what comes in and what goes out. No bank login is needed.",
  },
  {
    id: "see",
    title: "See where you stand",
    body: "Your Home page shows your net worth, what is left over each month and your breathing room.",
  },
  {
    id: "check-in",
    title: "Check in once a month",
    body: "A short check-in asks for the new balances, and the history page shows how they have changed.",
  },
] as const;

/**
 * Prototype 11 scales its scroll distances by its pace (1.4) twice: a band's moment runs over
 * 0.55 x 1.4 x 1.4 screens of scroll, the calendar page's over 1.6 times that share.
 */
const MOMENT_SCREENS = 0.55 * 1.4 * 1.4;
/** How closely a scroll-linked moment follows the scroll, in seconds of soft lag (prototype 11). */
export const SCROLL_LAG = 0.8;

/** A scroll-linked moment's trigger: from the band nearing the screen over a share of screens. */
export const momentScroll = (trigger: Element, screens: number) => ({
  trigger,
  start: "top 84%",
  end: () => `+=${Math.round(screens * window.innerHeight)}`,
  scrub: SCROLL_LAG,
  invalidateOnRefresh: true,
});

/**
 * Prototype 11's rough figures moment, tied to scroll: as the band rises through the screen the
 * line draws down through the steps, each step's circle fills and the step settles 12px into place,
 * and the calendar page rises beside them. Scrolling back runs it back. The server HTML, no
 * JavaScript and reduced motion show the finished band (the line drawn, every circle filled).
 */
export function roughFiguresMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const line = root.querySelector("[data-steps-line]");
  const steps = root.querySelector("[data-steps]");
  if (!line || !steps) return;
  const items = Array.from(root.querySelectorAll("[data-step]"));
  const timeline = gsap.timeline({
    scrollTrigger: momentScroll(steps, MOMENT_SCREENS * 1.4),
    defaults: { ease: "none" },
  });
  timeline.fromTo(line, { scaleY: 0 }, { scaleY: 1, duration: 3 }, 0);
  items.forEach((item, index) => {
    const at = index * 1.1;
    const node = item.querySelector("[data-step-node]");
    if (node) timeline.fromTo(node, { "--lit": 0 }, { "--lit": 1, duration: 0.5 }, at);
    timeline.fromTo(item, { x: 12 }, { x: 0, duration: 0.9, ease: "calm" }, at);
  });
  const picture = root.querySelector("[data-steps-picture]");
  if (!picture) return;
  gsap
    .timeline({
      scrollTrigger: momentScroll(picture, MOMENT_SCREENS * 1.6),
      defaults: { ease: "calm" },
    })
    .fromTo(picture, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, 0);
}

/**
 * "Start with rough figures" (ROLLOUT-PLAN M1, from prototype 11): the three steps on one line,
 * with the check-in calendar page beside them from 60rem.
 */
export const HomeRoughFigures: FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  useGsapMoment(rootRef, roughFiguresMoment);

  return (
    <MarketingBand
      bubbles="a"
      id="rough-figures"
      stop="Rough figures"
      title="Start with rough figures"
      tone="card"
    >
      <div className={roughLayout} ref={rootRef}>
        <div className={steps} data-steps="">
          <span aria-hidden="true" className={stepsTrack}>
            <span className={stepsLine} data-steps-line="" />
          </span>
          <ol className={stepList}>
            {ROUGH_FIGURE_STEPS.map((item, index) => (
              <li aria-labelledby={`step-${item.id}`} className={step} data-step="" key={item.id}>
                <span aria-hidden="true" className={stepNode} data-step-node="">
                  {index + 1}
                </span>
                <h3 className={stepTitle} id={`step-${item.id}`}>
                  {item.title}
                </h3>
                <p className={stepBody}>{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div
          className={roughPicture}
          data-steps-picture=""
          data-testid="rough-figures-illustration"
        >
          <Illustration scene="check-in" size="sm" palette="orb" variant="document" />
        </div>
      </div>
    </MarketingBand>
  );
};
