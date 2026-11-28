import { VisuallyHidden } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { Waves } from "lucide-react";
import { type FC, useId } from "react";
import { useMotionPreference } from "../../motion/useMotionPreference";
import { motionToggleButton } from "./MotionToggle.styles";

export interface MotionToggleProps {
  className?: string;
}

const LABEL = "Reduce motion";
const SYSTEM_NOTE = "On in your device settings";

/**
 * The site-wide "Reduce motion" button (UX-GUIDELINES MK14, WCAG 2.2.2): a real 44px button with
 * `aria-pressed`, in the header beside the theme switch on every page, named "Reduce motion" with
 * the same words as its tooltip. Pressed, the site behaves as it does under the system's reduced
 * motion: everything stops at once, every moment shows finished, and later pages and visits load
 * no motion library. A system setting of reduce wins: the button shows on, says why, and pressing
 * it does nothing (`aria-disabled`, so it stays reachable and its note is read).
 */
export const MotionToggle: FC<MotionToggleProps> = ({ className }) => {
  const { system, chosen, setChosen } = useMotionPreference();
  const noteId = useId();
  return (
    <>
      <button
        aria-describedby={system ? noteId : undefined}
        aria-disabled={system ? true : undefined}
        aria-pressed={system || chosen}
        className={cx(motionToggleButton(), className)}
        data-motion-toggle=""
        onClick={() => {
          if (!system) setChosen(!chosen);
        }}
        title={system ? `${LABEL}: ${SYSTEM_NOTE.toLowerCase()}` : LABEL}
        type="button"
      >
        <Waves aria-hidden="true" size={20} />
        <VisuallyHidden>{LABEL}</VisuallyHidden>
      </button>
      {/* Outside the button, so it is the button's description and never part of its name. */}
      {system && <VisuallyHidden id={noteId}>{SYSTEM_NOTE}</VisuallyHidden>}
    </>
  );
};
