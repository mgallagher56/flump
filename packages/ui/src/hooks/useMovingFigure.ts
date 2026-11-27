import { useCallback, useEffect, useRef, useState } from "react";
import { calmEase, marketingMs } from "./marketingTiming";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The only two kinds of moving figure (UX-GUIDELINES MK13 and MK10, DECISIONS D7), marketing only.
 * Never use either on a real figure in the apps (UX-GUIDELINES 12.1, M3).
 *
 * Both return the figure to draw (`display`, presentational) and the exact value to give assistive
 * technology (`text`), so the caller renders, with tabular figures:
 *
 *   <span className={tabular}>
 *     <span className={visuallyHidden}>{text}</span>
 *     <span aria-hidden="true">{displayText}</span>
 *   </span>
 *
 * `text` is the final value from the first render (and on the server), so a screen reader never
 * hears a value in between. Every frame goes through the same `format`, so the digits keep their
 * width and the figure settles on exactly `format(value)`.
 */
export interface MovingFigure {
  /** The value drawn this frame. Equal to the target when nothing is moving. */
  readonly display: number;
  /** `format(display)`: the presentational digits, hidden from assistive technology. */
  readonly displayText: string;
  /** `format(value)`: the exact final value, for assistive technology, from the first render. */
  readonly text: string;
  /** True while the figure is moving. */
  readonly moving: boolean;
}

export interface MovingFigureOptions {
  /** Formats a value for display, for example the en-GB currency formatter. Default `String`. */
  readonly format?: (value: number) => string;
  /** Overrides the token duration, in milliseconds. */
  readonly durationMs?: number;
}

/**
 * The value at `elapsed` milliseconds into a move from `from` to `to` over `duration` along the
 * calm easing. Exactly `to` once `elapsed` reaches `duration`, so a figure never rests short.
 */
export function figureAt(from: number, to: number, elapsed: number, duration: number): number {
  if (duration <= 0 || elapsed >= duration) return to;
  if (elapsed <= 0) return from;
  return from + (to - from) * calmEase(elapsed / duration);
}

interface Tween {
  readonly display: number;
  readonly moving: boolean;
}

/** Runs one move on animation frames; a new `start` replaces the move in flight. */
function useTween(initial: number) {
  const [tween, setTween] = useState<Tween>({ display: initial, moving: false });
  const raf = useRef(0);
  const current = useRef(initial);

  const stop = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);

  const jump = useCallback(
    (to: number) => {
      stop();
      current.current = to;
      setTween({ display: to, moving: false });
    },
    [stop],
  );

  const start = useCallback(
    (from: number, to: number, duration: number, onDone?: () => void) => {
      stop();
      if (from === to || duration <= 0) {
        jump(to);
        return;
      }
      let startedAt: number | null = null;
      const step = (now: number) => {
        startedAt ??= now;
        const elapsed = now - startedAt;
        const value = figureAt(from, to, elapsed, duration);
        current.current = value;
        const done = elapsed >= duration;
        setTween({ display: value, moving: !done });
        raf.current = done ? 0 : requestAnimationFrame(step);
        if (done) onDone?.();
      };
      current.current = from;
      setTween({ display: from, moving: true });
      raf.current = requestAnimationFrame(step);
    },
    [stop, jump],
  );

  useEffect(() => stop, [stop]);

  const running = useCallback(() => raf.current !== 0, []);

  return { tween, current, start, jump, running };
}

function toFigure(tween: Tween, value: number, format: (value: number) => string): MovingFigure {
  return {
    display: tween.display,
    displayText: format(tween.display),
    text: format(value),
    moving: tween.moving,
  };
}

export interface CountUpOptions extends MovingFigureOptions {
  /** True once the figure is in view (from the caller's IntersectionObserver). */
  readonly inView: boolean;
  /** Where the count starts. Default 0. */
  readonly from?: number;
}

/**
 * Count-up (MK13): a fixed sample figure tagged "Example" counts from `from` to `value` once, the
 * first time it is in view, over `durations.marketing.count` (2,240 ms) on the calm easing.
 *
 * The server render and the first client render draw the final value (MK1, P1: the page is complete
 * before any script runs). After mount, with motion allowed and the figure not yet seen, it rests at
 * `from` until in view. Once counted it never counts again, and a later change of `value` shows at
 * once. Under reduced motion it always draws `value` and never moves.
 */
export function useCountUp(value: number, options: CountUpOptions): MovingFigure {
  const { inView, from = 0, format = String, durationMs = marketingMs("count") } = options;
  const reduced = usePrefersReducedMotion();
  const { tween, current, start, jump, running } = useTween(value);
  const phase = useRef<"server" | "armed" | "counting" | "counted">("server");
  const shownValue = useRef(value);

  // Arm after mount: a figure that has not been seen waits at its start value.
  useEffect(() => {
    if (phase.current !== "server") return;
    if (reduced) {
      phase.current = "counted";
      return;
    }
    phase.current = "armed";
    jump(from);
  }, [reduced, from, jump]);

  // Leaving view mid-count never stops the count: only a new value or reduced motion does.
  useEffect(() => {
    const valueChanged = !Object.is(shownValue.current, value);
    shownValue.current = value;
    const done = () => {
      phase.current = "counted";
    };
    if (reduced) {
      done();
      jump(value);
    } else if (phase.current === "armed" && inView) {
      phase.current = "counting";
      start(from, value, durationMs, done);
    } else if (phase.current === "counting" && !valueChanged && !running()) {
      // StrictMode's rehearsal unmount cancelled the frames: carry on from the figure shown.
      start(current.current, value, durationMs, done);
    } else if (phase.current !== "armed" && phase.current !== "server" && valueChanged) {
      done();
      jump(value);
    }
  }, [inView, reduced, value, from, durationMs, start, jump, running, current]);

  return toFigure(tween, value, format);
}

/**
 * Glide (MK13, D7): an interactive calculator's result (the pay rise tool) moves from the value it
 * shows to the new `value` when the visitor's input changes, over `durations.marketing.glide`
 * (588 ms) on the calm easing, and settles on the exact value. It never moves on mount or first
 * view: the first value is drawn at once. A change mid-glide glides on from the figure shown, so
 * the digits never jump back. Under reduced motion every change shows at once.
 */
export function useGlide(value: number, options: MovingFigureOptions = {}): MovingFigure {
  const { format = String, durationMs = marketingMs("glide") } = options;
  const reduced = usePrefersReducedMotion();
  const { tween, current, start, jump } = useTween(value);
  const last = useRef(value);

  useEffect(() => {
    if (Object.is(last.current, value)) return;
    last.current = value;
    if (reduced) jump(value);
    else start(current.current, value, durationMs);
  }, [value, reduced, durationMs, start, jump, current]);

  useEffect(() => {
    if (reduced) jump(last.current);
  }, [reduced, jump]);

  return toFigure(tween, value, format);
}
