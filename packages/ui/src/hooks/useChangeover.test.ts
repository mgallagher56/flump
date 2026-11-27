import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ChangeoverState,
  changeoverReducer,
  DEFAULT_CHANGEOVER_DURATIONS,
  initialChangeover,
  phaseDuration,
  useChangeover,
} from "./useChangeover";

function mockReducedMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  };
  Object.defineProperty(window, "matchMedia", { value: () => mql, configurable: true });
  return (value: boolean) => {
    matches = value;
    for (const l of [...listeners]) l();
  };
}

const end = <T>(s: ChangeoverState<T>) => changeoverReducer(s, { type: "phaseEnd" });
const trigger = <T>(s: ChangeoverState<T>, target: T) =>
  changeoverReducer(s, { type: "trigger", target });

describe("changeoverReducer", () => {
  it("plays rest, leaving, beat, arriving, rest, swapping the content at the start of arriving", () => {
    const rest = initialChangeover("a");
    const leaving = trigger(rest, "b");
    expect(leaving).toEqual({ phase: "leaving", shown: "a", target: "b", queued: null });
    const beat = end(leaving);
    expect(beat).toEqual({ phase: "beat", shown: "a", target: "b", queued: null });
    const arriving = end(beat);
    expect(arriving).toEqual({ phase: "arriving", shown: "b", target: "b", queued: null });
    expect(end(arriving)).toEqual({ phase: "rest", shown: "b", target: "b", queued: null });
  });

  it("ignores a trigger for what is already shown at rest, and a phase end at rest", () => {
    const rest = initialChangeover("a");
    expect(trigger(rest, "a")).toEqual(rest);
    expect(end(rest)).toBe(rest);
  });

  it("queues a trigger during each moving phase without changing the phase or the content", () => {
    for (const steps of [0, 1, 2]) {
      let s = trigger(initialChangeover("a"), "b");
      for (let i = 0; i < steps; i++) s = end(s);
      const queued = trigger(s, "c");
      expect(queued).toEqual({ ...s, queued: "c" });
    }
  });

  it("keeps only the latest queued target when scrolling on quickly", () => {
    let s = trigger(initialChangeover(1), 2);
    s = trigger(s, 3);
    s = trigger(s, 4);
    s = trigger(s, 5);
    expect(s).toMatchObject({ phase: "leaving", target: 2, queued: 5 });
    s = end(end(end(s)));
    expect(s).toEqual({ phase: "leaving", shown: 2, target: 5, queued: null });
  });

  it("never reverses mid-way: scrolling back during a changeover plays it out, then returns", () => {
    let s = trigger(initialChangeover("a"), "b");
    s = trigger(s, "a");
    expect(s).toMatchObject({ phase: "leaving", shown: "a", target: "b", queued: "a" });
    s = end(end(s));
    expect(s).toMatchObject({ phase: "arriving", shown: "b" });
    s = end(s);
    expect(s).toEqual({ phase: "leaving", shown: "b", target: "a", queued: null });
    s = end(end(end(s)));
    expect(s).toEqual(initialChangeover("a"));
  });

  it("drops the queue when the latest trigger is the target already in flight", () => {
    let s = trigger(initialChangeover("a"), "b");
    s = trigger(s, "c");
    s = trigger(s, "b");
    expect(s.queued).toBeNull();
    expect(end(end(end(s)))).toEqual(initialChangeover("b"));
  });

  it("rests when the queued target is what the arrival shows", () => {
    let s = trigger(initialChangeover("a"), "b");
    s = end(end(s));
    s = { ...s, queued: "b" };
    expect(end(s)).toEqual(initialChangeover("b"));
  });

  it("settles straight on the latest target at rest", () => {
    const leaving = trigger(initialChangeover("a"), "b");
    expect(changeoverReducer(leaving, { type: "settle" })).toEqual(initialChangeover("b"));
    const queued = trigger(leaving, "c");
    expect(changeoverReducer(queued, { type: "settle" })).toEqual(initialChangeover("c"));
    const rest = initialChangeover("a");
    expect(changeoverReducer(rest, { type: "settle" })).toBe(rest);
  });
});

describe("phase durations", () => {
  it("come from the calm scale: disclosure to leave, stagger for the beat, entry to arrive", () => {
    // packages/tokens/src/motion.ts: disclosure 980ms, stagger 196ms, entry 1540ms.
    expect(DEFAULT_CHANGEOVER_DURATIONS).toEqual({ leave: 980, beat: 196, arrive: 1540 });
    expect(phaseDuration("leaving", DEFAULT_CHANGEOVER_DURATIONS)).toBe(980);
    expect(phaseDuration("beat", DEFAULT_CHANGEOVER_DURATIONS)).toBe(196);
    expect(phaseDuration("arriving", DEFAULT_CHANGEOVER_DURATIONS)).toBe(1540);
    expect(phaseDuration("rest", DEFAULT_CHANGEOVER_DURATIONS)).toBe(0);
  });
});

describe("useChangeover", () => {
  const durations = { leave: 100, beat: 20, arrive: 200 };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs each phase for its time and comes to rest on the target", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useChangeover("a", durations));
    act(() => result.current.trigger("b"));
    expect(result.current).toMatchObject({ phase: "leaving", shown: "a" });
    act(() => vi.advanceTimersByTime(99));
    expect(result.current.phase).toBe("leaving");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({ phase: "beat", shown: "a" });
    act(() => vi.advanceTimersByTime(20));
    expect(result.current).toMatchObject({ phase: "arriving", shown: "b" });
    act(() => vi.advanceTimersByTime(199));
    expect(result.current.phase).toBe("arriving");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toMatchObject({ phase: "rest", shown: "b", target: "b" });
  });

  it("absorbs rapid triggers both ways without restarting the phase timer", () => {
    mockReducedMotion(false);
    const { result } = renderHook(() => useChangeover(0, durations));
    act(() => result.current.trigger(1));
    act(() => vi.advanceTimersByTime(60));
    act(() => {
      result.current.trigger(2);
      result.current.trigger(0);
      result.current.trigger(3);
    });
    // The leave keeps its original end at 100 ms.
    act(() => vi.advanceTimersByTime(40));
    expect(result.current).toMatchObject({ phase: "beat", target: 1, queued: 3 });
    // One act per phase: React schedules the next phase's timer when the act flushes its effects.
    act(() => vi.advanceTimersByTime(20));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toMatchObject({ phase: "leaving", shown: 1, target: 3, queued: null });
    act(() => vi.advanceTimersByTime(100));
    act(() => vi.advanceTimersByTime(20));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toMatchObject({ phase: "rest", shown: 3 });
  });

  it("clears its timer when unmounted mid-play", () => {
    mockReducedMotion(false);
    const { result, unmount } = renderHook(() => useChangeover("a", durations));
    act(() => result.current.trigger("b"));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("jumps straight to the target's rest state under reduced motion", () => {
    mockReducedMotion(true);
    const { result } = renderHook(() => useChangeover("a", durations));
    act(() => result.current.trigger("b"));
    expect(result.current).toMatchObject({ phase: "rest", shown: "b", target: "b", queued: null });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("settles at once on the latest target when reduced motion turns on mid-play", () => {
    const setReduced = mockReducedMotion(false);
    const { result } = renderHook(() => useChangeover("a", durations));
    act(() => result.current.trigger("b"));
    act(() => result.current.trigger("c"));
    act(() => setReduced(true));
    expect(result.current).toMatchObject({ phase: "rest", shown: "c", queued: null });
    expect(vi.getTimerCount()).toBe(0);
  });
});
