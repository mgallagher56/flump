import { type FC, type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GlassOrb } from "../../p11/art/GlassOrb";
import { Bubbles } from "../../shared/round3";
import type { OrbLayout, OrbSpec } from "./orbScene";
import { type SceneLevel, useScene } from "./sceneLevel";
import { type OrbSceneState, useOrbScene } from "./useOrbScene";

/*
 * The decoration layers every page uses, by scene level. One layout function places the orbs for
 * both the still CSS orbs and the live three.js ones, so S0 and S1 show the same composition and
 * the owner compares only still against live. Everything here is aria-hidden and sits behind the
 * content (content after a layer is lifted above it in others.css).
 */

const useSize = (ref: RefObject<HTMLElement | null>) => {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

const StillOrbs: FC<{ specs: readonly OrbSpec[] }> = ({ specs }) => (
  <div className="o1-stage__still">
    {specs.map((spec, i) => (
      <GlassOrb
        className="o1-stage__orb"
        key={`${i}-${spec.tone}`}
        size={spec.d}
        style={{ left: `${spec.x * 100}%`, top: `${spec.y * 100}%` }}
        tone={spec.tone}
      />
    ))}
  </div>
);

const Live: FC<{
  container: RefObject<HTMLElement | null>;
  layout: OrbLayout;
  backdropToken: string;
  onState: (state: OrbSceneState, reason: string) => void;
}> = ({ container, layout, backdropToken, onState }) => {
  const { state, reason } = useOrbScene(container, layout, backdropToken);
  useEffect(() => onState(state, reason), [state, reason, onState]);
  return null;
};

/**
 * Orbs in a stage: still CSS orbs, replaced by the live scene once it is drawing (`live`). With
 * reduced motion or on a weak device the still orbs stay. `fixed` pins the stage to the viewport
 * (S2); otherwise it fills its positioned band.
 */
export const OrbStage: FC<{
  layout: OrbLayout;
  live: boolean;
  fixed?: boolean;
  backdropToken?: string;
}> = ({ layout, live, fixed = false, backdropToken = "--colors-surface-canvas" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  const [scene, setScene] = useState<{ state: OrbSceneState; reason: string }>({
    state: "still",
    reason: "",
  });
  const onState = useRef((state: OrbSceneState, reason: string) => setScene({ state, reason }));
  const specs = size && size.width > 0 ? layout(size.width, size.height) : [];
  return (
    <div
      aria-hidden="true"
      className={`o1-stage${fixed ? " o1-stage--fixed" : ""}`}
      data-live={live && scene.state === "live" ? "true" : "false"}
      ref={ref}
    >
      <StillOrbs specs={specs} />
      {live && (
        <Live
          backdropToken={backdropToken}
          container={ref}
          layout={layout}
          onState={onState.current}
        />
      )}
      <span className="o1-sr" data-testid="o1-scene-note">
        {live
          ? `Scene: ${scene.state === "live" ? "3D" : `still (${scene.reason.toLowerCase()})`}`
          : "Scene: still orbs"}
      </span>
    </div>
  );
};

/** The first band's decoration: still orbs at S0, the live scene at S1, nothing at S2 or none. */
export const HeroOrbs: FC<{ layout: OrbLayout }> = ({ layout }) => {
  const { level } = useScene();
  if (level === "none" || level === "s2") return null;
  return <OrbStage layout={layout} live={level === "s1"} />;
};

/** The whole-page canvas (S2 only), fixed behind everything. */
export const PageOrbs: FC<{ layout: OrbLayout }> = ({ layout }) => {
  const { level } = useScene();
  if (level !== "s2") return null;
  return <OrbStage fixed layout={layout} live />;
};

/** A band's bubble field at S0 and S1 (at S2 the page canvas carries the orbs). */
export const BandBubbles: FC<{ layout: "a" | "b" | "c"; levels?: readonly SceneLevel[] }> = ({
  layout,
  levels = ["s0", "s1"],
}) => {
  const { level } = useScene();
  return levels.includes(level) ? <Bubbles layout={layout} /> : null;
};
