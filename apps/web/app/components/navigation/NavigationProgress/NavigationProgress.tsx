import type { FC } from "react";
import { useNavigation } from "react-router";
import { navigationProgressBar } from "./NavigationProgress.styles";

/**
 * Global route-transition indicator (I-11). Shows while react-router reports a navigation or form
 * submission in flight. Indeterminate: there is no meaningful percentage to report.
 */
export const NavigationProgress: FC = () => {
  const navigation = useNavigation();
  if (navigation.state === "idle") return null;
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
