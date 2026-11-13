import { type FC, type ReactNode, useState } from "react";
import { INITIAL_VALUES, type OnboardingValues } from "./types";

/** Story and test support: holds the values so controlled steps behave as they do in the flow. */
export const StepHarness: FC<{
  initial?: Partial<OnboardingValues>;
  children: (api: {
    values: OnboardingValues;
    update: (patch: Partial<OnboardingValues>) => void;
  }) => ReactNode;
}> = ({ initial, children }) => {
  const [values, setValues] = useState<OnboardingValues>({ ...INITIAL_VALUES, ...initial });
  return <>{children({ values, update: (patch) => setValues((c) => ({ ...c, ...patch })) })}</>;
};
