import { useCallback, useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * The power policy (UX-GUIDELINES MK11, DECISIONS D2): whether a page may run its live 3D scene or
 * shows the still image instead. The content and layout are the same either way; only the orb is
 * still. Ported from the prototype's `useLazyScene.ts` and `threeKit.ts`.
 */
export type SceneMode = "live" | "still";

export type StillReason =
  /** Before the browser has been asked (the server render and the first client render). */
  | "pending"
  | "reduced-motion"
  | "save-data"
  | "low-memory"
  | "few-cores"
  | "no-webgl"
  | "slow-frames";

/** Under 4 GB of memory, under 4 cores or under 28 frames a second gives the still (MK11). */
export const MIN_DEVICE_MEMORY_GB = 4;
export const MIN_CORES = 4;
export const MIN_FPS = 28;

export interface ScenePowerInputs {
  readonly reducedMotion: boolean;
  /** `navigator.connection.saveData`; unknown counts as off. */
  readonly saveData?: boolean;
  /** `navigator.deviceMemory` in GB; unknown (Safari, Firefox) counts as enough. */
  readonly deviceMemoryGb?: number;
  /** `navigator.hardwareConcurrency`; unknown counts as enough. */
  readonly cores?: number;
  readonly webgl: boolean;
  /** The frame rate the scene measured, or undefined before it has measured. */
  readonly fps?: number;
}

export interface SceneDecision {
  readonly mode: SceneMode;
  readonly reason: StillReason | null;
}

/** The policy, pure. Checks run in this order and the first that fails names the reason. */
export function decideScenePower(inputs: ScenePowerInputs): SceneDecision {
  const still = (reason: StillReason): SceneDecision => ({ mode: "still", reason });
  if (inputs.reducedMotion) return still("reduced-motion");
  if (inputs.saveData === true) return still("save-data");
  if (inputs.deviceMemoryGb !== undefined && inputs.deviceMemoryGb < MIN_DEVICE_MEMORY_GB) {
    return still("low-memory");
  }
  if (inputs.cores !== undefined && inputs.cores < MIN_CORES) return still("few-cores");
  if (!inputs.webgl) return still("no-webgl");
  if (inputs.fps !== undefined && inputs.fps < MIN_FPS) return still("slow-frames");
  return { mode: "live", reason: null };
}

interface NavigatorHints {
  readonly deviceMemory?: number;
  readonly hardwareConcurrency?: number;
  readonly connection?: { readonly saveData?: boolean };
}

/** The device hints from a navigator-like object. A missing or non-numeric hint stays unknown. */
export function readDeviceHints(
  nav: NavigatorHints | undefined,
): Pick<ScenePowerInputs, "saveData" | "deviceMemoryGb" | "cores"> {
  const number = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : undefined);
  return {
    saveData: nav?.connection?.saveData === true,
    deviceMemoryGb: number(nav?.deviceMemory),
    cores: number(nav?.hardwareConcurrency),
  };
}

/** True when a canvas gives a WebGL 2 or WebGL context. The probe's context is released at once. */
export function hasWebgl(doc: Pick<Document, "createElement"> | undefined): boolean {
  if (!doc) return false;
  try {
    const canvas = doc.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as
      | WebGLRenderingContext
      | WebGL2RenderingContext
      | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export type FrameVerdict =
  /** Under 40 fps in the first window: drop the pixel ratio to 1 and measure again. */
  | { readonly kind: "downgrade"; readonly fps: number }
  /** Fast enough: stop measuring. */
  | { readonly kind: "settled"; readonly fps: number }
  /** Under `MIN_FPS` after the downgrade: give up and show the still. */
  | { readonly kind: "too-slow"; readonly fps: number };

/** The first measuring window, in milliseconds, and the frame rate under which it downgrades. */
export const FRAME_WINDOW_MS = 2000;
export const DOWNGRADE_FPS = 40;
/**
 * After the page was hidden, or after a stall, frames for this long are not counted: a browser
 * coming back from a background tab, or a throttled pane, runs a few uneven frames first.
 */
export const SETTLE_MS = 1000;
/**
 * A gap between two frames longer than this is a stall (a throttled or occluded pane, the tab
 * going to the background before the visibility event, a long task), not a slow frame: the
 * window starts again after a settle. The slowest steady rate the check still counts is 4 fps.
 */
export const MAX_FRAME_GAP_MS = 250;

export interface FrameRateCheckOptions {
  /** Whether the page is hidden now. Defaults to `document.hidden` (false without a document). */
  readonly isHidden?: () => boolean;
}

const documentHidden = () => typeof document !== "undefined" && document.hidden;

/**
 * The scene's frame rate check, pure (from `threeKit.ts`). Call `tick(now)` once per rendered frame
 * with the frame's timestamp. Over the first two-second window, under 40 fps asks for a downgrade
 * and a second window; at or over 40 settles. In the second window, under 28 fps is too slow.
 * Call `reset()` whenever the loop pauses (hidden tab, scene off screen), so a pause is never
 * counted as slow frames.
 *
 * Only frames a visitor could see count: a frame ticked while the page is hidden is ignored, and
 * after the page was hidden (seen by `tick` or `reset`) or after a stall longer than
 * `MAX_FRAME_GAP_MS`, the next `SETTLE_MS` of frames are ignored too before a window starts. So
 * background throttling never reads as a slow device (MK11).
 */
export function createFrameRateCheck({ isHidden = documentHidden }: FrameRateCheckOptions = {}) {
  let frames = 0;
  let windowStart: number | null = null;
  let last: number | null = null;
  /** Waiting out a settle; `settleFrom` is its first frame, null until that frame comes. */
  let settling = false;
  let settleFrom: number | null = null;
  let stage: "watch" | "downgraded" | "done" = "watch";
  const restart = () => {
    frames = 0;
    windowStart = null;
    last = null;
  };
  const settle = (from: number | null) => {
    settling = true;
    settleFrom = from;
  };
  return {
    tick(now: number): FrameVerdict | null {
      if (stage === "done") return null;
      if (isHidden()) {
        restart();
        settle(null);
        return null;
      }
      if (last !== null && now - last > MAX_FRAME_GAP_MS) {
        restart();
        settle(now);
      }
      last = now;
      if (settling) {
        if (settleFrom === null) settleFrom = now;
        if (now - settleFrom < SETTLE_MS) return null;
        settling = false;
        settleFrom = null;
      }
      if (windowStart === null) {
        windowStart = now;
        return null;
      }
      frames += 1;
      const elapsed = now - windowStart;
      if (elapsed < FRAME_WINDOW_MS) return null;
      const fps = (frames * 1000) / elapsed;
      frames = 0;
      windowStart = now;
      if (stage === "watch" && fps < DOWNGRADE_FPS) {
        stage = "downgraded";
        return { kind: "downgrade", fps };
      }
      const wasDowngraded = stage === "downgraded";
      stage = "done";
      return wasDowngraded && fps < MIN_FPS ? { kind: "too-slow", fps } : { kind: "settled", fps };
    },
    reset() {
      restart();
      if (isHidden()) settle(null);
    },
  };
}

export interface ScenePower extends SceneDecision {
  /** The scene reports its measured frame rate; under `MIN_FPS` it falls back to the still for good. */
  readonly reportFps: (fps: number) => void;
}

/**
 * The power policy as a hook. The server render and the first client render are `still` with
 * reason `pending`, so the page first paints with the still image (MK1). After mount it reads
 * reduced motion, the device hints and a WebGL probe once. Once frames were too slow it stays still
 * for the rest of the page view, so the scene never flickers between live and still; turning
 * reduced motion on makes it still at once. The frame check settles within the scene's first
 * seconds of visible running and then stops measuring, and it never counts frames from a hidden
 * or throttled page (`createFrameRateCheck`), so only a device that is slow while seen drops.
 */
export function useScenePower(): ScenePower {
  const reducedMotion = usePrefersReducedMotion();
  const [device, setDevice] = useState<Omit<ScenePowerInputs, "reducedMotion" | "fps"> | null>(
    null,
  );
  const [fps, setFps] = useState<number | undefined>(undefined);

  useEffect(() => {
    setDevice({
      ...readDeviceHints(typeof navigator === "undefined" ? undefined : navigator),
      webgl: hasWebgl(typeof document === "undefined" ? undefined : document),
    });
  }, []);

  const reportFps = useCallback((measured: number) => {
    setFps((previous) => (previous !== undefined && previous < MIN_FPS ? previous : measured));
  }, []);

  const decision: SceneDecision = device
    ? decideScenePower({ ...device, reducedMotion, fps })
    : { mode: "still", reason: reducedMotion ? "reduced-motion" : "pending" };
  return { ...decision, reportFps };
}
