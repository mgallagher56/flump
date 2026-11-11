import { type FC, useEffect, useRef, useState } from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../VisuallyHidden";
import { liveRegionRecipe } from "./LiveRegion.styles";

export interface LiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  debounceMs?: number;
  visuallyHidden?: boolean;
  /** Announce the first populated message too (default false: it is treated as load-time content). */
  announceInitial?: boolean;
  className?: string;
}

// Mounted empty; the first populated message (whether present at mount or filled in by a load-time
// effect after an empty mount) is a silent baseline, not an update, unless `announceInitial` is set.
// Text is inserted after the debounce once the message changes so screen readers detect it.
// Identical consecutive messages leave the state (and DOM) untouched, so they are not re-announced.
export const LiveRegion: FC<LiveRegionProps> = ({
  message,
  politeness = "polite",
  debounceMs = 500,
  visuallyHidden = false,
  announceInitial = false,
  className,
}) => {
  const [text, setText] = useState("");
  const baseline = useRef<string | null>(null);
  const hasChanged = useRef(false);

  useEffect(() => {
    if (!announceInitial) {
      if (baseline.current === null) {
        if (message === "") return;
        baseline.current = message;
      }
      // Compare against the baseline (not "first run") so StrictMode's double effect is safe.
      if (!hasChanged.current && message === baseline.current) return;
      hasChanged.current = true;
    }
    const id = setTimeout(() => setText(message), debounceMs);
    return () => clearTimeout(id);
  }, [message, debounceMs, announceInitial]);

  const role = politeness === "assertive" ? "alert" : "status";

  if (visuallyHidden) {
    return (
      <VisuallyHidden role={role} aria-atomic="true" className={className}>
        {text}
      </VisuallyHidden>
    );
  }
  return (
    <div role={role} aria-atomic="true" className={cx(liveRegionRecipe(), className)}>
      {text}
    </div>
  );
};

export default LiveRegion;
