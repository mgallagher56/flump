import { useEffect, useRef, useState } from "react";

export interface UseSaveConfirmationOptions {
  /** How long the saved confirmation stays active before resetting (ms). Default 2000ms. */
  durationMs?: number;
  /** Callback fired when the saved state expires. */
  onReset?: () => void;
}

export interface UseSaveConfirmationResult {
  /** True while the save confirmation is active. */
  isSaved: boolean;
  /** Trigger the saved confirmation state. */
  triggerSaved: () => void;
  /** Reset back to normal state immediately. */
  resetSaved: () => void;
}

/**
 * E17 Demo 5: Save confirmation.
 * Manages the 2-second confirmation window when a save succeeds.
 */
export function useSaveConfirmation(
  options: UseSaveConfirmationOptions = {},
): UseSaveConfirmationResult {
  const { durationMs = 2000, onReset } = options;
  const [isSaved, setIsSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSaved = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsSaved(false);
    onReset?.();
  };

  const triggerSaved = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsSaved(true);
    timerRef.current = setTimeout(() => {
      setIsSaved(false);
      onReset?.();
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { isSaved, triggerSaved, resetSaved };
}
