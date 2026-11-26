import { type FC, type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import weights from "../weights.json";
import { MotionContext, useMotionState } from "./motion";
import "./proto.css";

type PrototypeId = "p1" | "p2" | "p3";

const NAMES: Record<PrototypeId, string> = {
  p1: "1. Micro-interactions",
  p2: "2. Scroll story",
  p3: "3. 3D hero",
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

const DevPanel: FC<{ id: PrototypeId; motion: ReturnType<typeof useMotionState> }> = ({
  id,
  motion,
}) => {
  const fps = useFrameRate();
  const [open, setOpen] = useState(true);
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
export const PrototypeShell: FC<{ id: PrototypeId; children: ReactNode }> = ({ id, children }) => {
  const motion = useMotionState();
  return (
    <MotionContext.Provider value={motion}>
      <div className={`proto ${id}`} data-motion={motion.reduced ? "reduce" : "full"}>
        {children}
        <DevPanel id={id} motion={motion} />
      </div>
    </MotionContext.Provider>
  );
};
