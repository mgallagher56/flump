import { Illustration, marketingMs } from "@repo/ui";
import { type FC, useRef } from "react";
import type { GsapKit } from "../../motion/loadGsapKit";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { BubbleField } from "../BubbleField";
import { MarketingSection } from "../MarketingSection";
import {
  bubbleLayer,
  roughBand,
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
 * The line draws down through the steps once, by time, while the steps arrive in turn on the
 * stagger token; the calendar page rises with the last step. Started when the steps near the viewport and finished by time,
 * never scrubbed by scroll (MK2).
 */
export function roughFiguresMoment({ gsap }: GsapKit, root: HTMLElement): undefined {
  const line = root.querySelector("[data-steps-line]");
  if (!line) return;
  const items = Array.from(root.querySelectorAll("[data-step]"));
  const picture = root.querySelector("[data-steps-picture]");
  const draw = marketingMs("chart") / 1000;
  const entry = marketingMs("entry") / 1000;
  const timeline = gsap.timeline({
    scrollTrigger: { trigger: root, start: "top 84%", once: true },
    defaults: { ease: "calm" },
  });
  timeline.fromTo(line, { scaleY: 0 }, { scaleY: 1, duration: draw, ease: "calmInOut" }, 0);
  // The steps arrive on the stagger token, not with the line: the last is readable within half a
  // second of the band arriving (UX-GUIDELINES M1, motion never delays reading; PR 975 review).
  const stagger = marketingMs("stagger") / 1000;
  items.forEach((item, index) => {
    timeline.from(
      item,
      { x: 12, opacity: 0, duration: entry, clearProps: "transform,opacity" },
      stagger * index,
    );
  });
  if (picture) {
    timeline.from(
      picture,
      { y: 24, opacity: 0, duration: entry, clearProps: "transform,opacity" },
      (marketingMs("stagger") / 1000) * 2,
    );
  }
}

/**
 * "Start with rough figures" (ROLLOUT-PLAN M1, from prototype 11): the three steps on one line,
 * with the check-in calendar page beside them on wide screens.
 */
export const HomeRoughFigures: FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  useGsapMoment(rootRef, roughFiguresMoment);

  return (
    <MarketingSection
      className={roughBand}
      id="rough-figures"
      title="Start with rough figures"
      tone="card"
    >
      <div className={bubbleLayer}>
        <BubbleField layout="a" />
      </div>
      <div className={roughLayout} ref={rootRef}>
        <div className={steps}>
          <span aria-hidden="true" className={stepsTrack}>
            <span className={stepsLine} data-steps-line="" />
          </span>
          <ol className={stepList}>
            {ROUGH_FIGURE_STEPS.map((item, index) => (
              <li aria-labelledby={`step-${item.id}`} className={step} data-step="" key={item.id}>
                <span aria-hidden="true" className={stepNode}>
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
          <Illustration scene="check-in" size="sm" variant="document" />
        </div>
      </div>
    </MarketingSection>
  );
};
