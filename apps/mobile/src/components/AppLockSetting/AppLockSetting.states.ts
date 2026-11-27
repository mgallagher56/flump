import { APP_LOCK } from "../../copy/accountData";
import type { AppLockSettingProps } from "./AppLockSetting";

const onChange = () => undefined;

/** Named prop sets for the dev gallery and the tests (in place of Storybook stories). */
export const appLockSettingStates = {
  off: { value: false, availability: "available", onChange },
  on: { value: true, availability: "available", onChange },
  asking: { value: false, availability: "available", busy: true, onChange },
  noScreenLock: { value: false, availability: "noScreenLock", onChange },
  failed: { value: false, availability: "available", message: APP_LOCK.failed, onChange },
} satisfies Record<string, AppLockSettingProps>;
