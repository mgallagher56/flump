import type { ThemeCycleButtonProps } from "./ThemeCycleButton";

const noop = () => {};

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const themeCycleButtonStates = {
  system: { preference: "system", onChange: noop },
  light: { preference: "light", onChange: noop },
  dark: { preference: "dark", onChange: noop },
} satisfies Record<string, ThemeCycleButtonProps>;
