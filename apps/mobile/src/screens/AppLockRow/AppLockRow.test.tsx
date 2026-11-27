import { fireEvent, screen } from "@testing-library/react-native";
import { createAppLock } from "../../auth/deviceLock";
import { APP_LOCK } from "../../copy/accountData";
import { DEVICE_LOCK_KEY } from "../../device/storageKeys";
import { fakeApp, renderWithSession } from "../../testing/fakeAppSession";
import { AppLockRow } from "./AppLockRow";

function lockWith(over: { flag?: string; level?: number; succeed?: boolean } = {}) {
  const values = new Map<string, string>(over.flag ? [[DEVICE_LOCK_KEY, over.flag]] : []);
  const auth = {
    getEnrolledLevelAsync: jest.fn(async () => over.level ?? 3),
    authenticateAsync: jest.fn(async () => ({ success: over.succeed ?? true })),
  };
  const lock = createAppLock({
    auth,
    store: {
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void values.set(key, value),
      deleteItemAsync: async (key: string) => void values.delete(key),
    },
    accessible: 0,
    now: () => 0,
    isExempt: () => false,
    prompts: { unlock: "u", turnOn: "on", turnOff: "off" },
  });
  return { lock, auth, values };
}

const toggle = () => screen.getByRole("switch", { name: APP_LOCK.label });

describe("AppLockRow", () => {
  it("off by default; turning it on asks the phone, then stores the flag", async () => {
    const { lock, auth, values } = lockWith();
    await lock.start();
    await renderWithSession(<AppLockRow />, fakeApp(undefined, { appLock: lock }));
    expect(await screen.findByRole("switch", { name: APP_LOCK.label })).toBeEnabled();
    expect(toggle().props.accessibilityState.checked).toBe(false);
    await fireEvent.press(toggle());
    expect(auth.authenticateAsync).toHaveBeenCalledTimes(1);
    expect(values.get(DEVICE_LOCK_KEY)).toBe("on");
    expect(toggle().props.accessibilityState.checked).toBe(true);
  });

  it("a cancelled prompt leaves it off", async () => {
    const { lock, values } = lockWith({ succeed: false });
    await lock.start();
    await renderWithSession(<AppLockRow />, fakeApp(undefined, { appLock: lock }));
    await screen.findByRole("switch", { name: APP_LOCK.label });
    await fireEvent.press(toggle());
    expect(values.has(DEVICE_LOCK_KEY)).toBe(false);
    expect(toggle().props.accessibilityState.checked).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("no screen lock on the phone: disabled, with the sentence", async () => {
    const { lock } = lockWith({ level: 0 });
    await lock.start();
    await renderWithSession(<AppLockRow />, fakeApp(undefined, { appLock: lock }));
    expect(await screen.findByText(APP_LOCK.noScreenLock)).toBeOnTheScreen();
    expect(toggle()).toBeDisabled();
  });

  it("without a lock module in this build, nothing shows", async () => {
    await renderWithSession(<AppLockRow />, fakeApp());
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
