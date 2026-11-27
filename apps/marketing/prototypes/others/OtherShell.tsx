import { type CSSProperties, type FC, type ReactNode, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { MotionContext, useMotionState } from "../shared/motion";
import { PACE_FACTOR, PACE_LABEL, type Pace, PaceContext, usePaceState } from "../shared/pace";
import { PauseControl, SCENE_LABEL, SceneContext, type SceneLevel } from "./scene/sceneLevel";
import weights from "./weights.json";
import "../shared/proto.css";
import "../shared/kit3.css";
import "./others.css";

/*
 * The shell for the other marketing pages (round one of OTHER-PAGES-PLAN). A copy of
 * shared/PrototypeShell, kept apart so prototype 11's panel and pages stay exactly as they are, with
 * the scene level switch and the pause control added. Same pace as prototype 11 (Calm, 1.4 times
 * slower) and both bubble colour sets.
 */

export type OtherPageId = "features" | "pay" | "debt" | "pricing" | "privacy";

export const OTHER_NAMES: Record<OtherPageId, string> = {
  features: "Features index",
  pay: "Area page: Pay",
  debt: "Area page: Debt and borrowing",
  pricing: "Pricing",
  privacy: "Legal page: Privacy",
};

export const OTHER_PATHS: Record<OtherPageId, string> = {
  features: "/prototypes/others/features",
  pay: "/prototypes/others/pay",
  debt: "/prototypes/others/debt",
  pricing: "/prototypes/others/pricing",
  privacy: "/prototypes/others/privacy",
};

interface Sample {
  fps: number;
  worstMs: number;
}

const useFrameRate = () => {
  const [sample, setSample] = useState<Sample | null>(null);
  useEffect(() => {
    let frames = 0;
    let worst = 0;
    let windowStart = performance.now();
    let last = windowStart;
    let raf = 0;
    const tick = (now: number) => {
      frames += 1;
      worst = Math.max(worst, now - last);
      last = now;
      if (now - windowStart >= 500) {
        setSample({
          fps: Math.round((frames * 1000) / (now - windowStart)),
          worstMs: Math.round(worst),
        });
        frames = 0;
        worst = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onVisible = () => {
      windowStart = performance.now();
      last = windowStart;
      frames = 0;
      worst = 0;
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return sample;
};

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;

type LevelWeight = { initialGzip: number; cssGzip: number; lazyGzip: number };
const WEIGHTS = weights.pages as Partial<
  Record<OtherPageId, Partial<Record<SceneLevel, LevelWeight>>>
>;

const DevPanel: FC<{
  id: OtherPageId;
  levels: readonly SceneLevel[];
  level: SceneLevel;
  setLevel: (level: SceneLevel) => void;
  motion: ReturnType<typeof useMotionState>;
  pace: ReturnType<typeof usePaceState>;
}> = ({ id, levels, level, setLevel, motion, pace }) => {
  const fps = useFrameRate();
  const [open, setOpen] = useState(true);
  const weight = WEIGHTS[id]?.[level];
  return (
    <aside aria-label="Prototype controls" className="proto-panel" data-open={open}>
      <div className="proto-panel__row">
        <strong>{OTHER_NAMES[id]}</strong>
        <button
          aria-expanded={open}
          className="proto-panel__chip"
          onClick={() => setOpen(!open)}
          type="button"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <>
          <nav aria-label="Other pages" className="proto-panel__row">
            <Link to="/prototypes">All</Link>
            {(Object.keys(OTHER_NAMES) as OtherPageId[]).map((key) => (
              <Link
                aria-current={key === id ? "page" : undefined}
                key={key}
                to={`${OTHER_PATHS[key]}?scene=${level === "none" ? "s0" : level}`}
              >
                {key}
              </Link>
            ))}
          </nav>
          <div className="proto-panel__controls">
            <label>
              Scene{" "}
              <select onChange={(e) => setLevel(e.target.value as SceneLevel)} value={level}>
                {levels.map((key) => (
                  <option key={key} value={key}>
                    {SCENE_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Speed{" "}
              <select onChange={(e) => pace.setPace(e.target.value as Pace)} value={pace.pace}>
                {(Object.keys(PACE_LABEL) as Pace[]).map((key) => (
                  <option key={key} value={key}>
                    {PACE_LABEL[key]} ({Number((PACE_FACTOR[key] * pace.scale).toFixed(2))}x)
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            aria-pressed={motion.reduced}
            className="proto-panel__toggle"
            disabled={motion.osReduced}
            onClick={() => motion.setForced(!motion.forced)}
            type="button"
          >
            Reduce motion: {motion.reduced ? "on" : "off"}
          </button>
          {motion.osReduced && (
            <p className="proto-panel__note">Your system asks for reduced motion.</p>
          )}
          <dl className="proto-panel__stats">
            <dt>Frame rate</dt>
            <dd className="tabular-nums">
              {fps ? `${fps.fps} fps, longest frame ${fps.worstMs} ms` : "Measuring"}
            </dd>
            <dt>Added weight</dt>
            <dd className="tabular-nums">
              {weight
                ? `${kb(weight.initialGzip)} JS and ${kb(weight.cssGzip)} CSS on load${
                    weight.lazyGzip > 0 ? `, ${kb(weight.lazyGzip)} JS after first paint` : ""
                  } (gzip)`
                : "Not measured yet"}
            </dd>
          </dl>
        </>
      )}
    </aside>
  );
};

/**
 * One of the other pages: motion, pace and scene state, the dev panel and the pause control.
 * `levels` lists the scene levels the switch offers; `defaultLevel` is the plan's recommendation.
 */
export const OtherShell: FC<{
  id: OtherPageId;
  levels?: readonly SceneLevel[];
  defaultLevel: SceneLevel;
  children: ReactNode;
}> = ({ id, levels = ["s0", "s1", "s2"], defaultLevel, children }) => {
  const motion = useMotionState();
  const pace = usePaceState("both", 1.4);
  const [params, setParams] = useSearchParams();
  const asked = params.get("scene") as SceneLevel | null;
  const level = asked && levels.includes(asked) ? asked : defaultLevel;
  const [paused, setPaused] = useState(false);
  const setLevel = (next: SceneLevel) =>
    setParams(
      (current) => {
        current.set("scene", next);
        return current;
      },
      { replace: true },
    );
  return (
    <MotionContext.Provider value={motion}>
      <PaceContext.Provider value={pace}>
        <SceneContext.Provider value={{ level, setLevel, paused, setPaused }}>
          <Helmet>
            <title>{`${OTHER_NAMES[id]} | Flump motion prototype`}</title>
          </Helmet>
          <div
            className={`proto o1 o1--${id}`}
            data-ambient={paused ? "paused" : "running"}
            data-backdrop="both"
            data-motion={motion.reduced ? "reduce" : "full"}
            data-pace={pace.pace}
            data-scene={level}
            style={{ "--pace": pace.factor } as CSSProperties}
          >
            {children}
            {/* Fixed when the motion is page-wide, or where the hero is production's own markup. */}
            {(level === "s2" || id === "privacy") && <PauseControl />}
            <DevPanel
              id={id}
              level={level}
              levels={levels}
              motion={motion}
              pace={pace}
              setLevel={setLevel}
            />
          </div>
        </SceneContext.Provider>
      </PaceContext.Provider>
    </MotionContext.Provider>
  );
};
