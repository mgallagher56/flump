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

/** How long a smooth move keeps its stop in place against the page measuring itself again. */
export const STOP_HOLD_MS = 4000;
/** How often a held move checks where the page is. */
export const STOP_HOLD_TICK_MS = 200;

/**
 * What a held move does on a check: nothing when the page is within 2px of the stop's place, or
 * while a smooth scroll is still on its way; a jump to the place when the scroll has stopped short
 * of it (`stopped`: the scroll ended, or it has not moved since the last check).
 */
export function holdAction(state: {
  readonly y: number;
  readonly top: number;
  readonly stopped: boolean;
}): "stay" | "jump" {
  return Math.abs(state.y - state.top) > 2 && state.stopped ? "jump" : "stay";
}

/** Anything the reader does to scroll by themselves: a held move lets go at once. */
const READER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

/**
 * Keeps a smooth move's stop in place for `STOP_HOLD_MS`. A smooth scroll stops short when the page
 * measures itself again on the way (a band's real size arriving makes ScrollTrigger refresh, which
 * resets the scroll, sometimes before the scroll has moved at all, so no scroll end follows), and
 * the hero's pin can lengthen the page above the stop after it lands. So at every scroll end, and
 * every `STOP_HOLD_TICK_MS`, a scroll that has stopped away from the stop's place jumps the rest; a
 * second smooth scroll would be stopped the same way. The reader scrolling by themselves ends the
 * hold, so a later scroll is never pulled back. `onJump` runs after each jump (the page passing
 * the stop on the way may have started its changeover). `onRelease` runs when the hold ends,
 * however it ends. Returns the function that ends it.
 */
function holdMove(targetTop: () => number, onJump: () => void, onRelease: () => void): () => void {
  let lastY = window.scrollY;
  const check = (ended: boolean) => {
    const y = window.scrollY;
    const top = targetTop();
    const stopped = ended || Math.abs(y - lastY) < 1;
    lastY = y;
    if (holdAction({ y, top, stopped }) === "jump") {
      window.scrollTo({ top, behavior: "auto" });
      // Where the jump lands, so the next check does not take the jump for a scroll on its way.
      lastY = window.scrollY;
      onJump();
    }
  };
  const onEnd = () => check(true);
  const tick = window.setInterval(() => check(false), STOP_HOLD_TICK_MS);
  const end = () => {
    window.clearInterval(tick);
    window.clearTimeout(limit);
    window.removeEventListener("scrollend", onEnd);
    for (const type of READER_SCROLL_EVENTS) window.removeEventListener(type, end, true);
    onRelease();
  };
  const limit = window.setTimeout(end, STOP_HOLD_MS);
  window.addEventListener("scrollend", onEnd);
  for (const type of READER_SCROLL_EVENTS) {
    window.addEventListener(type, end, { capture: true, passive: true });
  }
  return end;
}

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
 * header (smooth unless motion is reduced, then held there while the page settles: `holdMove`) and
 * moves focus to its heading, so a keyboard or screen reader user lands where a sighted one does.
 * While the page scrolls the control steps out of the way and returns 700ms after the last scroll,
 * never while it holds focus or the pointer is on it. Nothing is rendered until mounted: the count depends on the scroll
 * position, so the server HTML and a page without JavaScript have no control.
 */
export const HomeStopControl: FC<HomeStopControlProps> = ({ aside }) => {
  const reduced = usePrefersReducedMotion();
  const [stops, setStops] = useState<HTMLElement[]>([]);
  const [current, setCurrent] = useState(0);
  /** Ends the hold of the last move (`holdMove`). */
  const finishRef = useRef<(() => void) | undefined>(undefined);
  /**
   * The stop a held move is going to: the count keeps showing it while the page settles, since the
   * scroll the page makes then is not the reader's (it can reset to the top for a moment).
   */
  const heldRef = useRef<number | null>(null);
  useEffect(() => () => finishRef.current?.(), []);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>(`[${STOP_ATTR}]`));
    setStops(found);
    let timer = 0;
    const update = () => {
      if (heldRef.current !== null) {
        setCurrent(heldRef.current);
        return;
      }
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
      const arrive = () => stop.dispatchEvent(new CustomEvent(STOP_ARRIVE_EVENT));
      arrive();
      const behavior = reduced ? "auto" : "smooth";
      const targetTop = () => stop.getBoundingClientRect().top + window.scrollY - headerHeight();
      const first = targetTop();
      window.scrollTo({ top: first, behavior });
      // Only the latest move is held, so a later move or the reader is never pulled back.
      finishRef.current?.();
      if (behavior === "smooth") {
        heldRef.current = index;
        // After a jump the stop is shown finished again, in case the page passed it on the way.
        finishRef.current = holdMove(targetTop, arrive, () => {
          heldRef.current = null;
          finishRef.current = undefined;
        });
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
