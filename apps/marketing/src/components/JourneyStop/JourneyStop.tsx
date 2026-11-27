import { type FC, useRef } from "react";
import { Link } from "react-router-dom";
import { SAMPLE_MOMENTS } from "../../motion/journey/sampleMoments";
import { leaveSeconds, pairArrive, pairLeave } from "../../motion/moments/arrive";
import { useGsapMoment } from "../../motion/useGsapMoment";
import { settleCounts } from "../CountUpFigure/countUpMoment";
import { settleDrawnCharts } from "../DrawnLineChart/drawChartMoment";
import { OrbDot } from "../GlassOrb";
import { STOP_ARRIVE_EVENT } from "../HomeStopControl";
import { JourneySample } from "../JourneySample";
import { LitCtas } from "../LitCtas";
import * as s from "./JourneyStop.styles";
import { type JourneyStopCopy, journeyStopId } from "./journeyStops";

export interface JourneyStopProps {
  stop: JourneyStopCopy;
  /** Its place in the journey, from 0: the sample swaps sides at every stop. */
  index: number;
  total: number;
  /** The journey's pinned changeovers are on (scripts ran, motion allowed, GSAP loaded). */
  live: boolean;
}

const headerHeight = () => document.querySelector("header")?.offsetHeight ?? 0;
/** A frame's beat: it starts that far above its section (its negative top margin). */
const beatOf = (frame: Element | null | undefined) =>
  frame ? -(Number.parseFloat(getComputedStyle(frame).marginTop) || 0) : 0;

/** The page's two calls to action, lit as the hero's (prototype 11's `LitCtas`), closing the journey. */
const StopCtas: FC = () => (
  <div className={s.ctas}>
    <LitCtas />
  </div>
);

/**
 * One stop of the journey (prototype 11's `stops/JourneyStop.tsx`): "N of 6", the title, lead, one
 * fact and a link (the last stop: the two calls to action), beside its sample, sides swapping at
 * every stop. A section in the page's stop control (`data-home-section`).
 *
 * The server render, no JavaScript and reduced motion: a plain section, everything finished and
 * visible (MK1). Live: scroll triggers the changeover and time completes it (MK2). Half a beat
 * before the section's top reaches the header the previous pair leaves (lifting and fading
 * together, on time), then this pair arrives on one timeline with its sample's moment, never
 * scrubbed; scrolling back reverses it, this pair going quickly and the previous returning. At
 * rest nothing in the frame moves (MK3). The last pair does not leave, and the empty foot of its
 * frame is trimmed so no empty screen follows. A stop reached by a jump is shown finished at once.
 *
 * Moving to a stop by the stop control sends it `STOP_ARRIVE_EVENT`: it shows finished at once,
 * the previous pair goes and the next one hides, so its heading can take focus and nothing covers
 * it. A waiting or departed pair is hidden by opacity, not visibility, so its links stay in the Tab
 * order: when one takes focus the stop does the same and scrolls to where it rests (its section top
 * under the header), so every stop's link is reached by Tab in order and shown finished (MK2).
 */
export const JourneyStop: FC<JourneyStopProps> = ({ stop, index, total, live }) => {
  const ref = useRef<HTMLElement>(null);
  const id = journeyStopId(stop.key);
  const titleId = `${id}-title`;
  const last = index === total - 1;

  useGsapMoment(
    ref,
    (kit, root) => {
      if (!live) return undefined;
      const { ScrollTrigger, gsap } = kit;
      const frame = root.querySelector<HTMLElement>("[data-stop-frame]");
      const pairEl = root.querySelector<HTMLElement>("[data-stop-pair]");
      const sampleRoot = root.querySelector<HTMLElement>("[data-sample]");
      if (!frame || !pairEl) return undefined;
      const next = root.nextElementSibling as HTMLElement | null;
      const nextIsStop = next?.hasAttribute("data-journey-stop") ?? false;
      const nextFrame = nextIsStop ? next?.querySelector("[data-stop-frame]") : null;
      // The span between this stop's top and the next one's.
      const span = () =>
        next && nextIsStop
          ? next.offsetTop - root.offsetTop
          : root.offsetHeight - frame.offsetHeight;
      const leaveS = leaveSeconds();
      const prev = root.previousElementSibling as HTMLElement | null;
      const prevIsStop = prev?.hasAttribute("data-journey-stop") ?? false;
      const offs: (() => void)[] = [];
      const listen = (target: HTMLElement, type: string, fn: () => void) => {
        target.addEventListener(type, fn);
        offs.push(() => target.removeEventListener(type, fn));
      };

      // Arrive: one timeline for both sides, after the previous pair has gone.
      const tl = pairArrive(kit, {
        sides: Array.from(root.querySelectorAll("[data-stop-side]")),
        lines: Array.from(root.querySelectorAll("[data-stop-panel] > *")),
        sample: sampleRoot
          ? { root: sampleRoot, moment: SAMPLE_MOMENTS[sampleRoot.dataset.sample ?? ""] }
          : undefined,
      });
      const arrive = gsap.timeline({ paused: true });
      arrive.add(tl, index === 0 ? 0 : leaveS);

      ScrollTrigger.create({
        // The first pair has none to replace: it arrives as its frame comes up the screen.
        trigger: index === 0 ? frame : root,
        start: () => (index === 0 ? "top 75%" : `top top+=${headerHeight() + beatOf(frame) * 0.5}`),
        invalidateOnRefresh: true,
        onEnter: () => {
          // Reached by a jump: the section top is already at the header, so show it finished.
          if (index > 0 && root.getBoundingClientRect().top <= headerHeight() + 2) {
            arrive.timeScale(1).progress(1);
            return;
          }
          arrive.timeScale(1).play();
        },
        onLeaveBack: () => {
          arrive.timeScale(arrive.duration() / leaveS).reverse();
        },
      });
      // The previous stop is shown: this pair, which comes after it in the page, hides at once.
      if (prev && prevIsStop) listen(prev, STOP_ARRIVE_EVENT, () => arrive.pause().progress(0));

      // Shown now (the stop control, or focus): finished, never half-faded (MK2).
      let leave: ReturnType<typeof pairLeave> | undefined;
      let back: ReturnType<typeof gsap.delayedCall> | undefined;
      const shown = () => arrive.progress() === 1 && (leave?.progress() ?? 0) === 0;
      listen(root, STOP_ARRIVE_EVENT, () => {
        back?.kill();
        leave?.pause(0);
        arrive.timeScale(1).progress(1);
      });
      listen(root, "focusin", () => {
        if (shown()) return;
        root.dispatchEvent(new CustomEvent(STOP_ARRIVE_EVENT));
        // Rest where scroll would have brought it, so the triggers agree with what shows.
        const top = root.getBoundingClientRect().top + window.scrollY - headerHeight();
        window.scrollTo({ top, behavior: "auto" });
      });
      const removeListeners = () => {
        for (const off of offs) off();
      };

      if (last) {
        // The last frame is a full screen but its pair is often shorter: pull what follows up
        // over the empty foot, so no empty screen follows the journey.
        const trim = () => {
          const empty =
            frame.getBoundingClientRect().bottom - pairEl.getBoundingClientRect().bottom;
          root.style.marginBottom = `${-Math.max(0, Math.round(empty - 56))}px`;
        };
        trim();
        ScrollTrigger.addEventListener("refreshInit", trim);
        return () => {
          removeListeners();
          ScrollTrigger.removeEventListener("refreshInit", trim);
          root.style.marginBottom = "";
          settleCounts(root);
          settleDrawnCharts(root);
        };
      }

      // Leave: at the next stop's changeover point, both sides together.
      const pairLeaves = pairLeave(kit, pairEl);
      leave = pairLeaves;
      // The next stop is shown: this pair has gone.
      if (next && nextIsStop) {
        listen(next, STOP_ARRIVE_EVENT, () => {
          back?.kill();
          pairLeaves.progress(1);
        });
      }
      ScrollTrigger.create({
        trigger: root,
        start: () => `top top+=${headerHeight() + beatOf(nextFrame) * 0.5 - span()}`,
        invalidateOnRefresh: true,
        onEnter: () => {
          back?.kill();
          if (next && next.getBoundingClientRect().top <= headerHeight() + 2)
            pairLeaves.progress(1);
          else pairLeaves.play();
        },
        // Wait while the next pair goes, so the two never show together.
        onLeaveBack: () => {
          back?.kill();
          back = gsap.delayedCall(leaveS, () => {
            pairLeaves.reverse();
          });
        },
      });
      return () => {
        removeListeners();
        back?.kill();
        settleCounts(root);
        settleDrawnCharts(root);
      };
    },
    [live, index, total],
  );

  return (
    <section
      aria-labelledby={titleId}
      className={s.stop}
      data-card-side={index % 2 === 0 ? "right" : "left"}
      data-home-section=""
      data-home-section-line="0.02"
      data-home-section-name={stop.short}
      data-journey-stop=""
      data-stop={index + 1}
      data-stop-key={stop.key}
      id={id}
      ref={ref}
    >
      <div className={s.frame} data-stop-frame="">
        <div
          className={s.pair({ sampleSide: index % 2 === 0 ? "right" : "left" })}
          data-stop-pair=""
        >
          <div className={s.side} data-stop-side="text">
            <div className={s.panel} data-stop-panel="">
              <p className={s.kicker} data-stop-kicker="">
                <OrbDot tone={stop.dot} />
                <span>
                  {index + 1} of {total}
                </span>
              </p>
              <h2 className={s.title} id={titleId}>
                {stop.title}
              </h2>
              <p className={s.lead}>{stop.lead}</p>
              <p className={s.fact}>{stop.fact}</p>
              {stop.link ? (
                <p>
                  <Link className={s.link} to={stop.link.to}>
                    {stop.link.label}
                  </Link>
                </p>
              ) : (
                <StopCtas />
              )}
            </div>
          </div>
          <div className={s.side} data-stop-side="sample">
            <JourneySample stop={stop.key} />
          </div>
        </div>
      </div>
    </section>
  );
};
