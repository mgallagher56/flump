import { Button } from "@repo/ui";
import { Pause, Play } from "lucide-react";
import type { FC } from "react";
import { useAmbientMotion } from "../../context/AmbientMotionContext";
import { control } from "./MotionControl.styles";

/**
 * Stops and restarts the page's ambient motion: the bubble fields and the orb at rest
 * (UX-GUIDELINES MK14, WCAG 2.2.2 "Pause, stop, hide"). Pausing also shows every entrance still to
 * play at its finished state, for good (`useGsapMoment`), so the label says "animation". A real button, reachable by keyboard and
 * visible wherever ambient motion plays. Hidden, and out of the tab order, before hydration and with
 * reduced motion, when nothing ambient moves. Its words sit in `data-motion-label`, so a narrow
 * dock can hide them visually while they stay the button's accessible name (HomeStopControl).
 */
export const MotionControl: FC = () => {
  const { available, paused, toggle } = useAmbientMotion();
  return (
    <span className={control({ available })} data-motion-control="">
      <Button
        aria-hidden={available ? undefined : true}
        disabled={!available}
        onClick={toggle}
        size="sm"
        tabIndex={available ? undefined : -1}
        type="button"
        variant="ghost"
      >
        {paused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
        <span data-motion-label="">{paused ? "Play animation" : "Pause animation"}</span>
      </Button>
    </span>
  );
};
