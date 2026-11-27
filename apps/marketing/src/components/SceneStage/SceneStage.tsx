import { createFrameRateCheck, useScenePower } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";
import { useAmbientMotion } from "../../context/AmbientMotionContext";
import { useStillMotion } from "../../context/StillMotionContext";
import { stage, still } from "./SceneStage.styles";

/** The frame rate check's verdict (`createFrameRateCheck` in `@repo/ui`). */
export type SceneVerdict =
  | { readonly kind: "downgrade"; readonly fps: number }
  | { readonly kind: "settled"; readonly fps: number }
  | { readonly kind: "too-slow"; readonly fps: number };

/** What a scene gets to start with. */
export interface SceneStartContext {
  /** The stage: the scene appends its canvas here. The still layer is inside it too. */
  readonly container: HTMLElement;
  readonly frameCheck: ReturnType<typeof createFrameRateCheck>;
  /** Ambient motion may play now (MK14). */
  readonly running: boolean;
  /** The frame rate check's word: `too-slow` makes the stage show the still (MK11). */
  readonly onVerdict: (verdict: SceneVerdict) => void;
  /** The WebGL context was lost: the stage shows the still. */
  readonly onLost: () => void;
  /** The first frame is on the canvas: the stage may hide the still. */
  readonly onFirstFrame: () => void;
}

/** What a started scene hands back. */
export interface SceneHandle {
  setRunning(running: boolean): void;
  /** The theme changed: read the colours again. */
  refreshColours(): void;
  dispose(): void;
}

export interface SceneStageProps {
  /**
   * Loads the scene by dynamic import and starts it. Called only when the power policy says
   * `live` and `watchRef` is near the viewport, so three.js never downloads otherwise (MK12).
   */
  start: (context: SceneStartContext) => Promise<SceneHandle>;
  /** The scene's range: it loads as this nears the viewport. */
  watchRef: RefObject<HTMLElement | null>;
  /** The still layer, shown until the live scene has drawn and whenever it cannot run. */
  children: ReactNode;
  /** Told when the live scene shows or the still comes back. */
  onSceneChange?: (scene: "live" | "still") => void;
  className?: string;
  /** `screen`: the journey's sticky full-screen layer. `band`: fills its positioned band (a hero). */
  fit?: "screen" | "band";
  "data-testid"?: string;
}

/**
 * A full-screen travelling layer for a three.js scene, with the marketing site's power policy
 * (UX-GUIDELINES MK11, MK12, MK14). Decoration only: hidden from assistive technology.
 *
 * The server render, a page without JavaScript and a reduced-motion page show the still layer.
 * The scene loads after first paint, by the caller's dynamic import, only when `useScenePower()`
 * says `live` (not under reduced motion, data saver, under 4 GB or 4 cores, without WebGL or
 * under 28 fps) and the range is within a screen and a half. It is told when ambient motion is
 * paused (MotionControl), re-reads its colours on a theme change, and if it gives up (context
 * lost, too slow, download failed) the still stays for this visit.
 */
export const SceneStage: FC<SceneStageProps> = ({
  start,
  watchRef,
  children,
  onSceneChange,
  className,
  fit = "screen",
  "data-testid": testId = "scene-stage",
}) => {
  const power = useScenePower();
  const { running } = useAmbientMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const runningRef = useRef(running);
  runningRef.current = running;
  const startRef = useRef(start);
  startRef.current = start;
  const reportFps = power.reportFps;
  const [failed, setFailed] = useState(false);
  const [drawn, setDrawn] = useState(false);
  // A still page (a story showing the rest state) never loads the scene, as with reduced motion.
  const stillPage = useStillMotion();
  const live = power.mode === "live" && !failed && !stillPage;

  useEffect(() => {
    const watched = watchRef.current;
    const container = stageRef.current;
    if (!live || !watched || !container) return;
    let cancelled = false;
    let handle: SceneHandle | null = null;

    const begin = () => {
      startRef
        .current({
          container,
          frameCheck: createFrameRateCheck(),
          running: runningRef.current,
          onVerdict: (verdict) => reportFps(verdict.fps),
          onLost: () => {
            if (!cancelled) setFailed(true);
          },
          onFirstFrame: () => {
            if (!cancelled) setDrawn(true);
          },
        })
        .then((created) => {
          if (cancelled) {
            created.dispose();
            return;
          }
          handle = created;
          handleRef.current = created;
          created.setRunning(runningRef.current);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };

    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined") begin();
    else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer?.disconnect();
            begin();
          }
        },
        { rootMargin: "150% 0px 150% 0px" },
      );
      observer.observe(watched);
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      handle?.dispose();
      handleRef.current = null;
      setDrawn(false);
    };
  }, [live, watchRef, reportFps]);

  useEffect(() => {
    handleRef.current?.setRunning(running);
  }, [running]);

  // A theme change re-reads the tokens.
  useEffect(() => {
    if (!live) return;
    const observer = new MutationObserver(() => handleRef.current?.refreshColours());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [live]);

  const scene = live && drawn ? "live" : "still";
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  useEffect(() => {
    onSceneChangeRef.current?.(scene);
  }, [scene]);

  return (
    <div
      aria-hidden="true"
      className={cx(stage({ fit }), className)}
      data-scene={scene}
      data-still-reason={
        scene === "still"
          ? failed
            ? "failed"
            : stillPage
              ? "still-page"
              : (power.reason ?? "loading")
          : undefined
      }
      data-testid={testId}
      ref={stageRef}
    >
      <div className={still} data-scene-still="">
        {children}
      </div>
    </div>
  );
};
