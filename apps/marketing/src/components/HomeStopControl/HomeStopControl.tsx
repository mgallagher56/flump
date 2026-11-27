import { usePrefersReducedMotion } from "@repo/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type FC, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { button, count, dock, label, nameText, nav } from "./HomeStopControl.styles";

/** The attribute that marks a stop, the short name it shows and its optional line. */
const STOP_ATTR = "data-home-section";
const NAME_ATTR = "data-home-section-name";
const LINE_ATTR = "data-home-section-line";

/**
 * Sent (not bubbling) to a stop just before the control moves to it: a stop whose content waits
 * for scroll (a journey stop's arrive) shows itself finished at once, so its heading can take
 * focus. A stop with nothing waiting ignores it.
 */
export const STOP_ARRIVE_EVENT = "home-stop-arrive";

/** How long the control stays out of the way after the last scroll event. */
export const STOP_CONTROL_RETURN_MS = 700;

/** A stop is current once its top passes the header plus this share of the screen. */
const DEFAULT_LINE = 1 / 3;

const headerHeight = () => document.querySelector("header")?.offsetHeight ?? 0;

/**
 * The index of the current stop: the last one whose top has passed a line under the header, a
 * third of the screen by default or the stop's own `data-home-section-line` (a fraction).
 */
export function currentStopIndex(
  tops: readonly { top: number; line: number }[],
  header: number,
  viewport: number,
): number {
  let index = 0;
  tops.forEach(({ top, line }, i) => {
    if (top <= header + viewport * line) index = i;
  });
  return index;
}

const lineOf = (stop: HTMLElement) => {
  const raw = Number(stop.getAttribute(LINE_ATTR));
  return stop.hasAttribute(LINE_ATTR) && Number.isFinite(raw) ? raw : DEFAULT_LINE;
};

const nameOf = (stops: readonly HTMLElement[], index: number) =>
  stops[index]?.getAttribute(NAME_ATTR) ?? `Section ${index + 1}`;

export interface HomeStopControlProps {
  /** Shown beside the control, such as the page's motion control (MK14). */
  aside?: ReactNode;
}

/**
 * Previous and next section buttons with a live "3 of 14 Accounts" label (prototype 11's section
 * nav). Fixed at the bottom left. The stops are every element marked `data-home-section`, in
 * document order, each labelled by its heading (`aria-labelledby`) and named by
 * `data-home-section-name`.
 *
 * Moving tells the stop to finish arriving (`STOP_ARRIVE_EVENT`), scrolls it to just under the
 * header (smooth unless motion is reduced) and moves focus to its heading, so a keyboard or screen reader user lands where a sighted one does. While the
 * page scrolls the control steps out of the way and returns 700ms after the last scroll, never
 * while it holds focus. Nothing is rendered until mounted: the count depends on the scroll
 * position, so the server HTML and a page without JavaScript have no control.
 */
export const HomeStopControl: FC<HomeStopControlProps> = ({ aside }) => {
  const reduced = usePrefersReducedMotion();
  const [stops, setStops] = useState<HTMLElement[]>([]);
  const [current, setCurrent] = useState(0);
  /** Drops the pending finish of the last move (see `go`). */
  const finishRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => finishRef.current?.(), []);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>(`[${STOP_ATTR}]`));
    setStops(found);
    let timer = 0;
    const update = () => {
      const tops = found.map((stop) => ({
        top: stop.getBoundingClientRect().top,
        line: lineOf(stop),
      }));
      setCurrent(currentStopIndex(tops, headerHeight(), window.innerHeight));
    };
    const onScroll = () => {
      update();
      setScrolling(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setScrolling(false), STOP_CONTROL_RETURN_MS);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, []);

  const go = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (!stop) return;
      // Finished first: a heading still hidden for its arrive cannot take focus.
      stop.dispatchEvent(new CustomEvent(STOP_ARRIVE_EVENT));
      const behavior = reduced ? "auto" : "smooth";
      const targetTop = () => stop.getBoundingClientRect().top + window.scrollY - headerHeight();
      const first = targetTop();
      window.scrollTo({ top: first, behavior });
      // A smooth scroll stops short when the page measures itself again on the way (a band's real
      // size arriving makes ScrollTrigger refresh, which resets the scroll): once it ends, finish
      // the move with one jump, since a second smooth scroll would be stopped the same way. Only
      // while this move is the latest, so a later scroll by the reader is never pulled back.
      finishRef.current?.();
      if (behavior === "smooth" && Math.abs(window.scrollY - first) > 2) {
        const finish = () => {
          const top = targetTop();
          if (Math.abs(window.scrollY - top) > 2) window.scrollTo({ top, behavior: "auto" });
        };
        const timer = window.setTimeout(() => finishRef.current?.(), 3000);
        window.addEventListener("scrollend", finish, { once: true });
        finishRef.current = () => {
          window.clearTimeout(timer);
          window.removeEventListener("scrollend", finish);
          finishRef.current = undefined;
        };
      }
      const headingId = stop.getAttribute("aria-labelledby")?.split(" ")[0];
      const heading = headingId ? document.getElementById(headingId) : null;
      const target = heading ?? stop;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      setCurrent(index);
    },
    [stops, reduced],
  );

  if (stops.length < 2) return null;
  const atStart = current === 0;
  const atEnd = current === stops.length - 1;

  return (
    <div className={dock} data-scrolling={scrolling || undefined} data-stop-control="">
      <nav aria-label="Sections" className={nav}>
        <button
          aria-label={
            atStart ? "Previous section" : `Previous section: ${nameOf(stops, current - 1)}`
          }
          className={button({ next: false })}
          disabled={atStart}
          onClick={() => go(current - 1)}
          type="button"
        >
          <ChevronUp aria-hidden="true" size={20} />
        </button>
        <p className={label} data-testid="stop-control-label">
          <span className={count}>
            {current + 1} of {stops.length}
          </span>{" "}
          <span className={nameText}>{nameOf(stops, current)}</span>
        </p>
        <button
          aria-label={atEnd ? "Next section" : `Next section: ${nameOf(stops, current + 1)}`}
          className={button({ next: true })}
          disabled={atEnd}
          onClick={() => go(current + 1)}
          type="button"
        >
          <ChevronDown aria-hidden="true" size={20} />
        </button>
      </nav>
      {aside}
    </div>
  );
};
