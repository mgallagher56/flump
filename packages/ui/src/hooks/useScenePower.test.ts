import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  createFrameRateCheck,
  decideScenePower,
  hasWebgl,
  readDeviceHints,
  type ScenePowerInputs,
  useScenePower,
} from "./useScenePower";

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

const capable: ScenePowerInputs = {
  reducedMotion: false,
  saveData: false,
  deviceMemoryGb: 8,
  cores: 8,
  webgl: true,
};

describe("decideScenePower", () => {
  it("goes live on a capable device", () => {
    expect(decideScenePower(capable)).toEqual({ mode: "live", reason: null });
  });

  it("is still under reduced motion", () => {
    expect(decideScenePower({ ...capable, reducedMotion: true })).toEqual({
      mode: "still",
      reason: "reduced-motion",
    });
  });

  it("is still with data saver on", () => {
    expect(decideScenePower({ ...capable, saveData: true }).reason).toBe("save-data");
  });

  it("is still under 4 GB of memory, live at exactly 4, and live when memory is unknown", () => {
    expect(decideScenePower({ ...capable, deviceMemoryGb: 2 }).reason).toBe("low-memory");
    expect(decideScenePower({ ...capable, deviceMemoryGb: 4 }).mode).toBe("live");
    expect(decideScenePower({ ...capable, deviceMemoryGb: undefined }).mode).toBe("live");
  });

  it("is still under 4 cores, live at exactly 4, and live when cores are unknown", () => {
    expect(decideScenePower({ ...capable, cores: 3 }).reason).toBe("few-cores");
    expect(decideScenePower({ ...capable, cores: 4 }).mode).toBe("live");
    expect(decideScenePower({ ...capable, cores: undefined }).mode).toBe("live");
  });

  it("is still without WebGL", () => {
    expect(decideScenePower({ ...capable, webgl: false }).reason).toBe("no-webgl");
  });

  it("is still under 28 fps, live at exactly 28, and live before measuring", () => {
    expect(decideScenePower({ ...capable, fps: 27.9 }).reason).toBe("slow-frames");
    expect(decideScenePower({ ...capable, fps: 28 }).mode).toBe("live");
    expect(decideScenePower({ ...capable, fps: undefined }).mode).toBe("live");
  });

  it("names the first failing check in order", () => {
    const weak = { reducedMotion: true, saveData: true, deviceMemoryGb: 1, cores: 1, webgl: false };
    expect(decideScenePower(weak).reason).toBe("reduced-motion");
    expect(decideScenePower({ ...weak, reducedMotion: false }).reason).toBe("save-data");
    expect(decideScenePower({ ...weak, reducedMotion: false, saveData: false }).reason).toBe(
      "low-memory",
    );
  });
});

describe("readDeviceHints and hasWebgl", () => {
  it("reads the navigator's hints and leaves missing ones unknown", () => {
    expect(
      readDeviceHints({ deviceMemory: 2, hardwareConcurrency: 6, connection: { saveData: true } }),
    ).toEqual({ saveData: true, deviceMemoryGb: 2, cores: 6 });
    expect(readDeviceHints({})).toEqual({
      saveData: false,
      deviceMemoryGb: undefined,
      cores: undefined,
    });
    expect(readDeviceHints(undefined).saveData).toBe(false);
  });

  it("finds WebGL from a canvas, releases the probe, and is false without one or on a throw", () => {
    let released = 0;
    const gl = { getExtension: () => ({ loseContext: () => released++ }) };
    const canvas = (context: object | null) => ({
      getContext: (kind: string) => (kind === "webgl" ? context : null),
    });
    const doc = (context: object | null) =>
      ({ createElement: () => canvas(context) }) as unknown as Document;
    expect(hasWebgl(doc(gl))).toBe(true);
    expect(released).toBe(1);
    expect(hasWebgl(doc(null))).toBe(false);
    const throwing = {
      createElement: () => {
        throw new Error("blocked");
      },
    } as unknown as Document;
    expect(hasWebgl(throwing)).toBe(false);
    expect(hasWebgl(undefined)).toBe(false);
  });
});

describe("createFrameRateCheck", () => {
  /** Ticks at a steady rate for `ms`, from `start`; returns the verdicts and the end time. */
  function run(check: ReturnType<typeof createFrameRateCheck>, fps: number, ms: number, start = 0) {
    const verdicts = [];
    const step = 1000 / fps;
    let now = start;
    for (; now <= start + ms; now += step) {
      const v = check.tick(now);
      if (v) verdicts.push(v.kind);
    }
    return { verdicts, end: now };
  }

  it("settles at 60 fps after the first two-second window", () => {
    expect(run(createFrameRateCheck(), 60, 4500).verdicts).toEqual(["settled"]);
  });

  it("downgrades under 40 fps, then settles if the second window reaches 28", () => {
    const check = createFrameRateCheck();
    const first = run(check, 30, 2100);
    expect(first.verdicts).toEqual(["downgrade"]);
    expect(run(check, 30, 2500, first.end).verdicts).toEqual(["settled"]);
  });

  it("is too slow when the second window stays under 28 fps", () => {
    const check = createFrameRateCheck();
    const first = run(check, 20, 2100);
    expect(run(check, 20, 2500, first.end).verdicts).toEqual(["too-slow"]);
  });

  it("does not count a pause after reset as slow frames", () => {
    const check = createFrameRateCheck();
    run(check, 60, 1000);
    check.reset();
    // Ten seconds hidden, then steady frames again: still fast.
    expect(run(check, 60, 2500, 11000).verdicts).toEqual(["settled"]);
  });

  /** A check whose page visibility the test sets. */
  function withVisibility() {
    const page = { hidden: false };
    return { page, check: createFrameRateCheck({ isHidden: () => page.hidden }) };
  }

  it("ignores frames ticked while the page is hidden, however slow", () => {
    const { page, check } = withVisibility();
    page.hidden = true;
    // A throttled background page: 5 fps for ten seconds would be downgrade then too slow if counted.
    expect(run(check, 5, 10_000).verdicts).toEqual([]);
    page.hidden = false;
    // Visible again at 60 fps: 1 s settle, then one 2 s window settles.
    expect(run(check, 60, 3500, 10_100).verdicts).toEqual(["settled"]);
  });

  it("does not count the first second after the page shows again", () => {
    const { page, check } = withVisibility();
    run(check, 60, 1000);
    page.hidden = true;
    check.reset();
    page.hidden = false;
    // Back from the background: 10 fps for 950 ms, then 60 fps. Counted, the first window would be
    // (9 + 63) frames over 2 s, 36 fps, a downgrade; settled out, it is 60 fps.
    const slow = run(check, 10, 950, 5000);
    expect(slow.verdicts).toEqual([]);
    const rest = run(check, 60, 2500, slow.end);
    expect(rest.verdicts).toEqual(["settled"]);
  });

  it("starts the settle on the first frame after a hidden tick, and counts from exactly 1 s", () => {
    const { page, check } = withVisibility();
    page.hidden = true;
    expect(check.tick(0)).toBeNull();
    page.hidden = false;
    // The settle runs from the first visible frame (at 100) to 1100; frames 4 apart then count.
    for (let now = 100; now < 1100; now += 4) expect(check.tick(now)).toBeNull();
    // At 1100 the window starts; 2 s of 4 ms frames is 250 fps: settled, never a downgrade.
    let verdict = null;
    for (let now = 1100; now <= 3100 && !verdict; now += 4) verdict = check.tick(now);
    expect(verdict).toEqual({ kind: "settled", fps: 250 });
  });

  it("treats a gap over 250 ms as a stall, not a slow frame, but counts a gap of exactly 250 ms", () => {
    // A visible but throttled pane: one frame every 300 ms never gives a verdict.
    expect(
      run(createFrameRateCheck({ isHidden: () => false }), 1000 / 300, 20_000).verdicts,
    ).toEqual([]);
    // One frame every 250 ms is 4 fps and counted: downgrade, then too slow.
    const steady = createFrameRateCheck({ isHidden: () => false });
    expect(run(steady, 4, 4500).verdicts).toEqual(["downgrade", "too-slow"]);
  });

  it("is still too slow at a steady 20 fps on a visible page", () => {
    const { check } = withVisibility();
    expect(run(check, 20, 4500).verdicts).toEqual(["downgrade", "too-slow"]);
  });
});

function Probe() {
  const power = useScenePower();
  return createElement("span", null, `${power.mode}:${power.reason}`);
}

describe("useScenePower", () => {
  it("renders the still on the server, before the browser is asked", () => {
    mockReducedMotion(false);
    expect(renderToString(createElement(Probe))).toBe("<span>still:pending</span>");
  });

  it("decides from the device after mount and falls back for good on slow frames", () => {
    mockReducedMotion(false);
    Object.defineProperty(navigator, "deviceMemory", { value: 8, configurable: true });
    Object.defineProperty(navigator, "hardwareConcurrency", { value: 8, configurable: true });
    const original = document.createElement.bind(document);
    document.createElement = ((tag: string) =>
      tag === "canvas"
        ? { getContext: () => ({ getExtension: () => null }) }
        : original(tag)) as typeof document.createElement;
    try {
      const { result } = renderHook(() => useScenePower());
      expect(result.current).toMatchObject({ mode: "live", reason: null });
      act(() => result.current.reportFps(20));
      expect(result.current).toMatchObject({ mode: "still", reason: "slow-frames" });
      act(() => result.current.reportFps(60));
      expect(result.current.reason).toBe("slow-frames");
    } finally {
      document.createElement = original;
    }
  });

  it("is still without WebGL, and at once when reduced motion turns on", () => {
    const setReduced = mockReducedMotion(false);
    const { result } = renderHook(() => useScenePower());
    // happy-dom's canvas has no WebGL.
    expect(result.current.reason).toBe("no-webgl");
    act(() => setReduced(true));
    expect(result.current).toMatchObject({ mode: "still", reason: "reduced-motion" });
  });
});
