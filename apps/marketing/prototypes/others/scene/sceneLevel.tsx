import { Button } from "@repo/ui";
import { Pause, Play } from "lucide-react";
import { createContext, type FC, useContext } from "react";
import { useMotion } from "../../shared/motion";

/**
 * The scene levels the owner compares on every page (OTHER-PAGES-PLAN section 4), switched from the
 * dev panel and kept in the address (`?scene=s1`) so a view can be shared:
 *
 * - `none`: no orbs or bubbles at all (offered on the legal page only).
 * - `s0`: still. CSS glass orbs and bubble fields only; three.js never loads.
 * - `s1`: a small live three.js scene in the first band only: glass orbs in the journey's material,
 *   floating in place. The rest of the page is as S0.
 * - `s2`: one full-viewport canvas fixed behind the whole page; the bands lose their own colour so
 *   the canvas shows through.
 */
export type SceneLevel = "none" | "s0" | "s1" | "s2";

export const SCENE_LABEL: Record<SceneLevel, string> = {
  none: "Nothing",
  s0: "S0 still orbs",
  s1: "S1 hero scene",
  s2: "S2 whole-page scene",
};

export interface SceneState {
  level: SceneLevel;
  setLevel: (level: SceneLevel) => void;
  /** The visitor pressed Pause animation. */
  paused: boolean;
  setPaused: (paused: boolean) => void;
}

export const SceneContext = createContext<SceneState>({
  level: "s0",
  setLevel: () => {},
  paused: false,
  setPaused: () => {},
});

export const useScene = () => useContext(SceneContext);

/** True when something on the page moves on its own for more than five seconds (a live scene). */
export const useHasAmbient = (): boolean => {
  const { level } = useScene();
  const { reduced } = useMotion();
  return !reduced && (level === "s1" || level === "s2");
};

/**
 * Stops and restarts the page's ambient motion (WCAG 2.2.2; production's MotionControl, same
 * wording). Prototype 11 has no such control; production requires one on every page with ambient
 * motion, so these pages carry it. A real button, in view wherever the motion plays: under the
 * calls to action at S1 (the scene is in the first band only), fixed at the bottom left at S2.
 * Shown only when a live scene is on (S1, S2); S0's only movement is the bubbles' small drift,
 * which follows the reader's own scrolling.
 */
export const PauseControl: FC<{ inline?: boolean }> = ({ inline = false }) => {
  const { paused, setPaused } = useScene();
  if (!useHasAmbient()) return null;
  return (
    <span className={inline ? "o1-pause o1-pause--inline" : "o1-pause"}>
      <Button onClick={() => setPaused(!paused)} size="sm" type="button" variant="ghost">
        {paused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
        {paused ? "Play animation" : "Pause animation"}
      </Button>
    </span>
  );
};
