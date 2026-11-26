import { ChevronDown, ChevronUp } from "lucide-react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { useMotion } from "./motion";
import "./kit.css";

/**
 * Previous and next section buttons for prototypes 4 to 7, plus a live "2 of 7: Budget" label.
 *
 * Stops are the elements marked `data-proto-section`, in document order. Each must sit in normal
 * flow (not a pinned element) and be labelled by a heading (`aria-labelledby`); its
 * `data-proto-name` gives the short name for the label; `data-proto-line` optionally moves the
 * point where it becomes current (see update below). A stop can also be a marker element that
 * is only a scroll position, for scenes that step through one pinned or 3D section.
 *
 * Moving scrolls the stop to the top (smooth unless motion is reduced) and moves focus to its
 * heading, so a keyboard or screen reader user lands where a sighted user does.
 */
export const SectionNav: FC = () => {
  const { reduced } = useMotion();
  const [stops, setStops] = useState<HTMLElement[]>([]);
  const [current, setCurrent] = useState(0);
  const liveRef = useRef<HTMLParagraphElement>(null);

  // Step out of the way while the page scrolls, back after a short pause (never while focused).
  useEffect(() => {
    const html = document.documentElement;
    let timer = 0;
    const onScroll = () => {
      html.dataset.protoScrolling = "true";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        delete html.dataset.protoScrolling;
      }, 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
      delete html.dataset.protoScrolling;
    };
  }, []);

  useEffect(() => {
    const found = Array.from(document.querySelectorAll<HTMLElement>("[data-proto-section]"));
    setStops(found);
    const header = () => document.querySelector("header")?.offsetHeight ?? 0;
    const update = () => {
      // The current stop is the last one whose top has passed the upper third of the screen.
      // A stop becomes current once its top passes a line under the header: a third of the
      // screen by default, or its own `data-proto-line` (a fraction of the screen) for stops that
      // overlap on purpose, such as the journey's, which are finished when their top meets the header.
      const lineFor = (stop: HTMLElement) =>
        header() + window.innerHeight * Number(stop.dataset.protoLine ?? 0.33);
      let index = 0;
      found.forEach((stop, i) => {
        if (stop.getBoundingClientRect().top <= lineFor(stop)) index = i;
      });
      setCurrent(index);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const go = useCallback(
    (index: number) => {
      const stop = stops[index];
      if (!stop) return;
      const header = document.querySelector("header")?.offsetHeight ?? 0;
      const top = stop.getBoundingClientRect().top + window.scrollY - header;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      const headingId = stop.getAttribute("aria-labelledby")?.split(" ")[0];
      const heading = headingId ? document.getElementById(headingId) : null;
      const focusTarget = heading ?? stop;
      if (!focusTarget.hasAttribute("tabindex")) focusTarget.setAttribute("tabindex", "-1");
      focusTarget.focus({ preventScroll: true });
    },
    [stops, reduced],
  );

  if (stops.length < 2) return null;
  const name = (i: number) => stops[i]?.dataset.protoName ?? `Section ${i + 1}`;
  const atStart = current === 0;
  const atEnd = current === stops.length - 1;

  return (
    <nav aria-label="Sections" className="proto-sectionnav">
      <button
        aria-label={atStart ? "Previous section" : `Previous section: ${name(current - 1)}`}
        className="proto-sectionnav__button"
        disabled={atStart}
        onClick={() => go(current - 1)}
        type="button"
      >
        <ChevronUp aria-hidden="true" size={20} />
      </button>
      <p className="proto-sectionnav__label tabular-nums" ref={liveRef}>
        <span className="proto-sectionnav__count">
          {current + 1} of {stops.length}
        </span>{" "}
        <span className="proto-sectionnav__name">{name(current)}</span>
      </p>
      <button
        aria-label={atEnd ? "Next section" : `Next section: ${name(current + 1)}`}
        className="proto-sectionnav__button proto-sectionnav__button--next"
        disabled={atEnd}
        onClick={() => go(current + 1)}
        type="button"
      >
        <ChevronDown aria-hidden="true" size={20} />
      </button>
    </nav>
  );
};

/**
 * The cue under a hero that says there is more below. A real link to the next section, so it
 * works before any script runs; it bobs gently unless motion is reduced, and fades once the reader
 * has scrolled.
 */
export const ScrollCue: FC<{ href: string; label: string }> = ({ href, label }) => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 60);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <a className="proto-scrollcue" data-scrolled={scrolled} href={href}>
      <span>{label}</span>
      <ChevronDown aria-hidden="true" className="proto-scrollcue__icon" size={20} />
    </a>
  );
};
