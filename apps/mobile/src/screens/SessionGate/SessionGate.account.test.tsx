/**
 * The session gate's S9 screens: the deletion states, the in-place delete on the Not invited and
 * Terms screens, and the app lock's cover over the shell.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import { Alert, type AlertButton, AppState, type AppStateStatus, Platform } from "react-native";
import { type AppLock, createAppLock } from "../../auth/deviceLock";
import { SessionProvider } from "../../auth/SessionProvider";
import { Text } from "../../components/Text";
import {
  ACCOUNT_DELETED_CLOSE,
  LOCKED,
  WEB_ACCOUNT_DELETED,
  WEB_DELETE,
  WEB_EXPORT,
  WEB_FINISH_DELETION,
} from "../../copy/accountData";
import { SIGN_OUT } from "../../copy/auth";
import { DEVICE_LOCK_KEY } from "../../device/storageKeys";
import { type FakeApp, fakeApp } from "../../testing/fakeAppSession";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SessionGate } from "./SessionGate";

const FIGURE = "£52,100";

/** How many times the shell has mounted: a remount would lose the route and any page's state. */
let shellMounts = 0;
function ShellProbe() {
  useEffect(() => {
    shellMounts += 1;
  }, []);
  return <Text testID="shell">{FIGURE}</Text>;
}

async function gate(app: FakeApp) {
  shellMounts = 0;
  await render(
    <ThemeProvider scheme="light">
      <SessionProvider app={app.app}>
        <SessionGate>
          <ShellProbe />
        </SessionGate>
      </SessionProvider>
    </ThemeProvider>,
  );
}

/** Presses the confirm button of the platform alert the last Alert.alert call opened. */
async function confirmAlert(alert: jest.SpyInstance, label: string) {
  const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  await act(async () => buttons.find((b) => b.text === label)?.onPress?.());
}

describe("the deletion states", () => {
  it("deletionPending replaces the shell with the last step, and Sign out asks first", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const app = fakeApp({ status: "deletionPending" });
    await gate(app);
    expect(screen.queryByTestId("shell")).toBeNull();
    expect(screen.getByRole("header")).toHaveTextContent(WEB_FINISH_DELETION.heading);
    await fireEvent.press(screen.getByRole("button", { name: SIGN_OUT }));
    expect(app.session.signOut).not.toHaveBeenCalled();
    await confirmAlert(alert, SIGN_OUT);
    expect(app.session.signOut).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it("accountDeleted replaces the shell with the confirmation; Close goes to sign-in", async () => {
    const app = fakeApp({ status: "accountDeleted" });
    await gate(app);
    expect(screen.queryByTestId("shell")).toBeNull();
    expect(screen.getByRole("header")).toHaveTextContent(WEB_ACCOUNT_DELETED.heading);
    await fireEvent.press(screen.getByRole("button", { name: ACCOUNT_DELETED_CLOSE }));
    expect(app.session.acknowledgeDeletion).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
  });
});

describe.each([
  ["notInvited", "This account has not been invited yet"],
  ["termsRequired", "Please agree to our terms on the website"],
] as const)("data rights on the %s screen", (status, heading) => {
  it("offers download and delete; delete opens in place and Cancel comes back", async () => {
    const app = fakeApp({ status });
    await gate(app);
    expect(screen.getByRole("header", { name: heading })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: WEB_EXPORT.button }));
    expect(app.accountData.exportData).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.trigger }));
    expect(screen.getByRole("header", { name: WEB_DELETE.confirmTitle })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("header", { name: heading })).toBeOnTheScreen();
  });

  it("a deletion from there wipes and confirms", async () => {
    const app = fakeApp({ status });
    await gate(app);
    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.trigger }));
    await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    await fireEvent.press(screen.getByRole("button", { name: WEB_DELETE.confirm }));
    expect(app.session.accountDeleted).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("header")).toHaveTextContent(WEB_ACCOUNT_DELETED.heading);
  });
});

describe("the app lock over the shell", () => {
  let appStateListeners: ((next: AppStateStatus) => void)[] = [];
  beforeEach(() => {
    appStateListeners = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
      appStateListeners.push(handler as (next: AppStateStatus) => void);
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  function lockWith(over: {
    flag?: string;
    level?: number;
    succeed?: boolean;
    exempt?: boolean;
    /** The flag's read never settles, so the lock stays `checking`. */
    pending?: boolean;
  }) {
    const values = new Map<string, string>(over.flag ? [[DEVICE_LOCK_KEY, over.flag]] : []);
    const auth = {
      getEnrolledLevelAsync: jest.fn(async () => over.level ?? 3),
      authenticateAsync: jest.fn(async () => ({ success: over.succeed ?? true })),
    };
    const lock: AppLock = createAppLock({
      auth,
      store: {
        getItemAsync: (key: string) =>
          over.pending
            ? new Promise<string | null>(() => {})
            : Promise.resolve(values.get(key) ?? null),
        setItemAsync: async (key: string, value: string) => void values.set(key, value),
        deleteItemAsync: async (key: string) => void values.delete(key),
      },
      accessible: 0,
      now: () => 0,
      isExempt: () => over.exempt ?? false,
      prompts: { unlock: "u", turnOn: "on", turnOff: "off" },
    });
    return { lock, auth, values };
  }

  /**
   * Not rendered at all, not merely hidden: a native stack's screens sit outside the accessibility
   * flags of a parent view, so a screen reader read figures through a hidden shell (device check).
   */
  const shellHidden = () =>
    screen.queryByTestId("shell", { includeHiddenElements: true }) === null &&
    screen.queryByText(/£/, { includeHiddenElements: true }) === null;

  it.each([
    ["checking", { flag: "on", pending: true }, null],
    ["locked", { flag: "on" }, LOCKED.heading],
    ["noScreenLock", { flag: "on", level: 0 }, LOCKED.heading],
  ] as const)("while %s, no part of the shell is rendered", async (phase, over, heading) => {
    const { lock } = lockWith(over);
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    expect(lock.getPhase()).toBe(phase);
    if (heading) expect(screen.getByRole("header")).toHaveTextContent(heading);
    else expect(screen.getByTestId("locked")).toBeOnTheScreen();
    expect(shellHidden()).toBe(true);
  });

  it("with the lock off, the shell shows and nothing covers it", async () => {
    const { lock } = lockWith({});
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    expect(screen.getByTestId("shell")).toHaveTextContent(FIGURE);
    expect(screen.queryByText(LOCKED.heading)).toBeNull();
  });

  it("a cold start with the lock on covers the shell; Unlock uncovers it", async () => {
    const { lock } = lockWith({ flag: "on" });
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    expect(screen.getByRole("header")).toHaveTextContent(LOCKED.heading);
    // The shell is not rendered behind the cover; the route lives in expo-router's global state.
    expect(shellHidden()).toBe(true);
    await fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock }));
    expect(screen.getByTestId("shell")).toBeOnTheScreen();
    expect(screen.queryByText(LOCKED.heading)).toBeNull();
  });

  it("a failed unlock stays locked", async () => {
    const { lock } = lockWith({ flag: "on", succeed: false });
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    await fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock }));
    expect(screen.getByText(LOCKED.heading)).toBeOnTheScreen();
    expect(shellHidden()).toBe(true);
  });

  it("Sign out from the lock screen asks first, then signs out", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const { lock } = lockWith({ flag: "on", level: 0 });
    const app = fakeApp({ status: "signedIn" }, { appLock: lock });
    await gate(app);
    expect(screen.getByText(LOCKED.noScreenLock)).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: LOCKED.unlock })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: SIGN_OUT }));
    await confirmAlert(alert, SIGN_OUT);
    expect(app.session.signOut).toHaveBeenCalledTimes(1);
  });

  const cover = () => screen.queryByTestId("app-switcher-cover");

  it("while unlocked on iOS, a system sheet or the app switcher puts a cover over the shell, which stays mounted", async () => {
    const { lock } = lockWith({ flag: "on" });
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    await fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock }));
    expect(screen.getByTestId("shell")).toBeOnTheScreen();
    expect(cover()).toBeNull();
    for (const state of ["inactive", "background"] as const) {
      await act(async () => {
        for (const listener of appStateListeners) listener(state);
      });
      expect(cover()).toBeOnTheScreen();
      expect(screen.getByTestId("shell")).toBeOnTheScreen();
      await act(async () => {
        for (const listener of appStateListeners) listener("active");
      });
      expect(cover()).toBeNull();
    }
    // Mounted once at Unlock and never again: the page and its state are where they were.
    expect(shellMounts).toBe(1);
  });

  it("while unlocked on Android, no cover: FLAG_SECURE blanks the recents card instead", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    const { lock } = lockWith({ flag: "on" });
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    await act(async () => lock.unlock());
    await act(async () => {
      for (const listener of appStateListeners) listener("background");
    });
    expect(cover()).toBeNull();
    expect(screen.getByTestId("shell")).toBeOnTheScreen();
    expect(shellMounts).toBe(1);
  });

  it("the phone's own prompt (turning app lock off) brings no cover and no remount", async () => {
    const { lock, auth } = lockWith({ flag: "on" });
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    await fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock }));
    let answer: (result: { success: boolean }) => void = () => undefined;
    auth.authenticateAsync.mockImplementationOnce(
      () => new Promise((resolve) => (answer = resolve)),
    );
    let turnedOff: Promise<unknown> = Promise.resolve();
    await act(async () => {
      turnedOff = lock.turnOff();
    });
    await act(async () => {
      for (const listener of appStateListeners) listener("inactive");
    });
    expect(cover()).toBeNull();
    await act(async () => {
      for (const listener of appStateListeners) listener("active");
      answer({ success: true });
      await turnedOff;
    });
    expect(lock.getPhase()).toBe("off");
    expect(screen.getByTestId("shell")).toBeOnTheScreen();
    expect(shellMounts).toBe(1);
  });

  it("no cover while the sign-in browser is open", async () => {
    const { lock } = lockWith({ flag: "on", exempt: true });
    await gate(fakeApp({ status: "signedIn" }, { appLock: lock }));
    await fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock }));
    await act(async () => {
      for (const listener of appStateListeners) listener("background");
    });
    expect(screen.getByTestId("shell")).toBeOnTheScreen();
  });

  it("the lock never covers the sign-in screen", async () => {
    const { lock } = lockWith({ flag: "on" });
    await gate(fakeApp({ status: "signedOut", notice: null }, { appLock: lock }));
    expect(screen.queryByText(LOCKED.heading)).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
  });
});
