import { type FC, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import weights from "../weights.json";
import { MotionContext, useMotionState } from "./motion";
import {
  BACKDROP_LABEL,
  type Backdrop,
  PACE_FACTOR,
  PACE_LABEL,
  type Pace,
  PaceContext,
  type PaceState,
  usePaceState,
} from "./pace";
import "./proto.css";

export type PrototypeId =
  | "p1"
  | "p1b"
  | "p2"
  | "p3"
  | "p4"
  | "p5"
  | "p6"
  | "p7"
  | "p8"
  | "p9"
  | "p10";

const NAMES: Record<PrototypeId, string> = {
  p1: "1. Micro-interactions",
  p1b: "1b. Micro-interactions, extended",
  p2: "2. Scroll story",
  p3: "3. 3D hero",
  p4: "4. The picture assembles",
  p5: "5. Five scenes",
  p6: "6. The orb as a guide",
  p7: "7. Fly-through",
  p8: "8. Assembled",
  p9: "9. The journey",
  p10: "10. Both",
};

interface Sample {
  fps: number;
  worstMs: number;
}

declare global {
  interface Window {
    /** Frame-rate samples for measurement from the browser console (dev only). */
    __protoFps?: Sample[];
  }
}

/** Live frame rate over half-second windows, with the longest frame in each window. */
const useFrameRate = () => {
  const [sample, setSample] = useState<Sample | null>(null);
  useEffect(() => {
    let frames = 0;
    let worst = 0;
    let windowStart = performance.now();
    let last = windowStart;
    let raf = 0;
    window.__protoFps = [];
    const tick = (now: number) => {
      frames += 1;
      worst = Math.max(worst, now - last);
      last = now;
      if (now - windowStart >= 500) {
        const next = {
          fps: Math.round((frames * 1000) / (now - windowStart)),
          worstMs: Math.round(worst),
        };
        window.__protoFps?.push(next);
        setSample(next);
        frames = 0;
        worst = 0;
        windowStart = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // A hidden tab stops rAF; restart the window so the gap is not counted as one long frame.
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

const DevPanel: FC<{
  id: PrototypeId;
  motion: ReturnType<typeof useMotionState>;
  startsOpen: boolean;
  pace?: PaceState;
}> = ({ id, motion, startsOpen, pace }) => {
  const fps = useFrameRate();
  const [open, setOpen] = useState(startsOpen);
  const weight = weights.prototypes[id];
  return (
    <aside aria-label="Prototype controls" className="proto-panel" data-open={open}>
      <div className="proto-panel__row">
        <strong>{NAMES[id]}</strong>
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
          <nav aria-label="Prototypes" className="proto-panel__row">
            <Link to="/prototypes">All</Link>
            {(Object.keys(NAMES) as PrototypeId[]).map((key) => (
              <Link
                aria-current={key === id ? "page" : undefined}
                key={key}
                to={`/prototypes/${key.slice(1)}`}
              >
                {key.slice(1)}
              </Link>
            ))}
          </nav>
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
          {pace && (
            <div className="proto-panel__controls">
              <label>
                Speed{" "}
                <select onChange={(e) => pace.setPace(e.target.value as Pace)} value={pace.pace}>
                  {(Object.keys(PACE_LABEL) as Pace[]).map((key) => (
                    <option key={key} value={key}>
                      {PACE_LABEL[key]} ({PACE_FACTOR[key]}x)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Bubbles{" "}
                <select
                  onChange={(e) => pace.setBackdrop(e.target.value as Backdrop)}
                  value={pace.backdrop}
                >
                  {(Object.keys(BACKDROP_LABEL) as Backdrop[]).map((key) => (
                    <option key={key} value={key}>
                      {BACKDROP_LABEL[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <dl className="proto-panel__stats">
            <dt>Frame rate</dt>
            <dd className="tabular-nums">
              {fps ? `${fps.fps} fps, longest frame ${fps.worstMs} ms` : "Measuring"}
            </dd>
            <dt>Added weight</dt>
            <dd className="tabular-nums">
              {kb(weight.initialGzip)} JS and {kb(weight.cssGzip)} CSS on load
              {weight.lazyGzip > 0 && `, ${kb(weight.lazyGzip)} JS after first paint`} (gzip)
            </dd>
          </dl>
        </>
      )}
    </aside>
  );
};

/** One prototype page: the motion state, the dev panel and the page itself. */
/**
 * `panel` "closed" starts the dev panel folded (prototypes 4 to 7, which also show the section
 * buttons at the bottom left and need the room on a phone).
 */
export const PrototypeShell: FC<{
  id: PrototypeId;
  children: ReactNode;
  panel?: "open" | "closed";
  /** Round three: the shared pace tokens, the Speed and Bubbles controls (see pace.tsx). */
  paced?: boolean;
}> = ({ id, children, panel = "open", paced = false }) => {
  const motion = useMotionState();
  const pace = usePaceState();
  return (
    <MotionContext.Provider value={motion}>
      <PaceContext.Provider value={pace}>
        <div
          className={`proto ${id}`}
          data-backdrop={paced ? pace.backdrop : undefined}
          data-motion={motion.reduced ? "reduce" : "full"}
          data-pace={paced ? pace.pace : undefined}
          style={paced ? ({ "--pace": pace.factor } as React.CSSProperties) : undefined}
        >
          {children}
          <DevPanel
            id={id}
            motion={motion}
            pace={paced ? pace : undefined}
            startsOpen={panel === "open"}
          />
        </div>
      </PaceContext.Provider>
    </MotionContext.Provider>
  );
};
