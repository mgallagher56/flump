import { useOptionalToast } from "@repo/ui";
import { useCallback } from "react";

export type OnboardingNotify = (message: string) => void;

/**
 * The one place onboarding announces something transient ("Your details are saved"). It raises a
 * toast through the app's ToastProvider, and does nothing when rendered without one (isolated
 * stories and tests).
 */
export function useOnboardingNotify(): OnboardingNotify {
  const toast = useOptionalToast()?.toast;
  return useCallback<OnboardingNotify>(
    (message) => {
      toast?.({ title: message, tone: "positive" });
    },
    [toast],
  );
}
