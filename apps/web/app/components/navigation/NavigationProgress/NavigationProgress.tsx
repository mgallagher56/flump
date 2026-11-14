import { useDelayedPending } from "@repo/ui";
import type { FC } from "react";
import { useNavigation } from "react-router";
import { navigationProgressBar } from "./NavigationProgress.styles";

/**
 * Global route-transition indicator (I-11), and the only loading signal for moving between pages:
 * the current page stays on screen until the next is ready. Timed by the shared `useDelayedPending`,
 * so a fast navigation shows nothing and a slow one shows the bar for at least the minimum.
 * Indeterminate: there is no meaningful percentage to report.
 */
export const NavigationProgress: FC = () => {
  const navigation = useNavigation();
  const show = useDelayedPending(navigation.state !== "idle");
  if (!show) return null;
  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className={navigationProgressBar()}
      id="navigation-progress"
      role="progressbar"
    />
  );
};

export default NavigationProgress;
