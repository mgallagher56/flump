import { type FC, useEffect, useRef, useState } from "react";
import { cx } from "../../../styled-system/css";
import { VisuallyHidden } from "../VisuallyHidden";
import { liveRegionRecipe } from "./LiveRegion.styles";

export interface LiveRegionProps {
  message: string;
  politeness?: "polite" | "assertive";
  debounceMs?: number;
  visuallyHidden?: boolean;
  className?: string;
}

// Mounted empty; the initial message is never announced (it is page content, not an update).
// Text is inserted after the debounce once the message changes so screen readers detect it.
// Identical consecutive messages leave the state (and DOM) untouched, so they are not re-announced.
export const LiveRegion: FC<LiveRegionProps> = ({
  message,
  politeness = "polite",
  debounceMs = 500,
  visuallyHidden = false,
  className,
}) => {
  const [text, setText] = useState("");
  const initialMessage = useRef(message);
  const hasChanged = useRef(false);

  useEffect(() => {
    // Compare against the mount value (not "first run") so StrictMode's double effect is safe.
    if (!hasChanged.current && message === initialMessage.current) return;
    hasChanged.current = true;
    const id = setTimeout(() => setText(message), debounceMs);
    return () => clearTimeout(id);
  }, [message, debounceMs]);

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
