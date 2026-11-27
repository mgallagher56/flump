import { useCallback, useEffect, useReducer, useRef } from "react";
import { marketingMs } from "./marketingTiming";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * A changeover's phases (UX-GUIDELINES MK2, ROLLOUT-PLAN P2): scroll triggers it and time completes
 * it. The old content leaves, a short beat passes with nothing moving, the new content arrives, and
 * the page rests.
 */
export type ChangeoverPhase = "rest" | "leaving" | "beat" | "arriving";

export interface ChangeoverState<T> {
  readonly phase: ChangeoverPhase;
  /** What is on screen: the old content while leaving and during the beat, the new from arriving on. */
  readonly shown: T;
  /** Where the changeover in flight is going; equal to `shown` at rest. */
  readonly target: T;
  /** The latest target asked for during a changeover, played next. Null when none is waiting. */
  readonly queued: T | null;
}

export type ChangeoverEvent<T> =
  /** Scroll (or a button) asks for `target`. */
  | { readonly type: "trigger"; readonly target: T }
  /** The current phase's time is up. */
  | { readonly type: "phaseEnd" }
  /** Reduced motion: go straight to the latest target, at rest. */
  | { readonly type: "settle" };

export function initialChangeover<T>(shown: T): ChangeoverState<T> {
  return { phase: "rest", shown, target: shown, queued: null };
}

function leaveFor<T>(shown: T, target: T): ChangeoverState<T> {
  return Object.is(shown, target)
    ? initialChangeover(shown)
    : { phase: "leaving", shown, target, queued: null };
}

function afterPhase<T>(state: ChangeoverState<T>): ChangeoverState<T> {
  switch (state.phase) {
    case "rest":
      return state;
    case "leaving":
      return { ...state, phase: "beat" };
    case "beat":
      return { ...state, phase: "arriving", shown: state.target };
    case "arriving":
      return state.queued === null
        ? initialChangeover(state.shown)
        : leaveFor(state.shown, state.queued);
  }
}

/**
 * The changeover state machine, pure. A trigger at rest starts leaving. A trigger during a
 * changeover never interrupts or reverses it: it replaces the queued target (the latest wins), and
 * a trigger for the target already in flight clears the queue. When the arrival ends, the queued
 * target, if any and different from what is shown, starts the next changeover.
 */
export function changeoverReducer<T>(
  state: ChangeoverState<T>,
  event: ChangeoverEvent<T>,
): ChangeoverState<T> {
  switch (event.type) {
    case "trigger":
      if (state.phase === "rest") return leaveFor(state.shown, event.target);
      return { ...state, queued: Object.is(event.target, state.target) ? null : event.target };
    case "phaseEnd":
      return afterPhase(state);
    case "settle": {
      const end = state.queued ?? state.target;
      return state.phase === "rest" && Object.is(end, state.shown) ? state : initialChangeover(end);
    }
  }
}

/** How long each moving phase lasts, in milliseconds. */
export interface ChangeoverDurations {
  readonly leave: number;
  readonly beat: number;
  readonly arrive: number;
}

/**
 * From the marketing calm scale: leaving over `disclosure` (980 ms), a beat of one `stagger`
 * (196 ms), arriving over `entry` (1,540 ms). Leaving is shorter than arriving so the new content
 * gets the longer, calmer movement.
 */
export const DEFAULT_CHANGEOVER_DURATIONS: ChangeoverDurations = {
  leave: marketingMs("disclosure"),
  beat: marketingMs("stagger"),
  arrive: marketingMs("entry"),
};

export function phaseDuration(phase: ChangeoverPhase, durations: ChangeoverDurations): number {
  switch (phase) {
    case "leaving":
      return durations.leave;
    case "beat":
      return durations.beat;
    case "arriving":
      return durations.arrive;
    case "rest":
      return 0;
  }
}

export interface UseChangeoverResult<T> extends ChangeoverState<T> {
  /** Ask for `target`. Safe to call on every scroll event: repeats are absorbed by the queue. */
  readonly trigger: (target: T) => void;
}

/**
 * The trigger-and-complete changeover (UX-GUIDELINES MK2) as a hook. The caller draws `phase` and
 * `shown` (for example a `data-phase` attribute that its styles animate over the same durations),
 * and calls `trigger` from its scroll observer. Under reduced motion every trigger lands at once
 * on the target's rest state, and turning reduced motion on mid-play settles at once. Timers stop
 * on unmount.
 */
export function useChangeover<T>(
  initial: T,
  durations: ChangeoverDurations = DEFAULT_CHANGEOVER_DURATIONS,
): UseChangeoverResult<T> {
  const reduced = usePrefersReducedMotion();
  const [state, dispatch] = useReducer(
    changeoverReducer as (s: ChangeoverState<T>, e: ChangeoverEvent<T>) => ChangeoverState<T>,
    initial,
    initialChangeover,
  );
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    if (reduced) dispatch({ type: "settle" });
  }, [reduced]);

  const { leave, beat, arrive } = durations;
  // Every phase change moves to a different phase (an arrival that starts a queued changeover goes
  // to leaving), so the phase alone restarts the timer. A queued trigger changes only `queued` and
  // must not restart it.
  const { phase } = state;
  useEffect(() => {
    if (reduced || phase === "rest") return;
    const ms = phaseDuration(phase, { leave, beat, arrive });
    const id = setTimeout(() => dispatch({ type: "phaseEnd" }), ms);
    return () => clearTimeout(id);
  }, [phase, reduced, leave, beat, arrive]);

  const trigger = useCallback((target: T) => {
    dispatch({ type: "trigger", target });
    if (reducedRef.current) dispatch({ type: "settle" });
  }, []);

  return { ...state, trigger };
}
