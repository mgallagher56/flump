import type { FC } from "react";
import type { StopKey } from "../p11/journeyTypes";
import { MOMENT_END, STOP_VISUALS } from "../p11/stops/visuals";
import { TIMING } from "../shared/pace";
import type { Moment } from "./blocks";
import "../p11/stops/stops.css";

/**
 * One of the journey's set pieces (the payslip unfolding, the debt running down) on its own: built
 * from prototype 11's own visual and timeline, and played once on time when it is well in view, so
 * a reader who stops scrolling sees it either not started or finished, never half way.
 */
export const setPieceMoment =
  (key: StopKey): Moment =>
  (kit, root, pace) => {
    const visual = root.querySelector<HTMLElement>(".o1-setpiece");
    if (!visual) return;
    const tl = kit.gsap.timeline({ paused: true, defaults: { ease: "calm" } });
    STOP_VISUALS[key].build(kit, tl, visual);
    tl.set({}, {}, MOMENT_END);
    tl.timeScale(tl.duration() / pace.s(TIMING.entry * 2.2));
    kit.ScrollTrigger.create({
      trigger: visual,
      start: "top 78%",
      once: true,
      onEnter: () => tl.play(),
    });
  };

/** The set piece's markup: prototype 11's visual for that stop. */
export const SetPiece: FC<{ stopKey: StopKey }> = ({ stopKey }) => {
  const { Visual } = STOP_VISUALS[stopKey];
  return (
    <div className="o1-setpiece">
      <Visual />
    </div>
  );
};
