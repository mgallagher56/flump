import { router as appRouter, Stack } from "expo-router";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import { AppState, type AppStateStatus } from "react-native";
import * as signedInLayout from "../../app/(app)/_layout";
import TabsLayout from "../../app/(app)/(tabs)/_layout";
import HomeTab from "../../app/(app)/(tabs)/index";
import MoreTab from "../../app/(app)/(tabs)/more";
import SettingsDataRoute from "../../app/(app)/settings/data";
import SettingsRoute from "../../app/(app)/settings/index";
import SettingsPhoneRoute from "../../app/(app)/settings/phone";
import { type AppLock, createAppLock, LOCK_AFTER_MS } from "../auth/deviceLock";
import { SessionProvider } from "../auth/SessionProvider";
import { EXPORT, LOCKED, WEB_EXPORT } from "../copy/accountData";
import { ApiProvider } from "../data/ApiProvider";
import { fakeApi, testQueryClient } from "../data/fakeApi";
import { DEVICE_LOCK_KEY } from "../device/storageKeys";
import { household, routes } from "../features/check-in/checkInTestData";
import { type FakeApp, fakeApp } from "../testing/fakeAppSession";
import { ThemeProvider } from "../theme/ThemeProvider";

/**
 * App lock with the real signed-in routes (E12 S9, plan 9.10): a system sheet or prompt while
 * unlocked leaves the person where they were, and unlocking after a timed lock brings them back to
 * the page they were on, although the shell is not rendered at all while locked.
 */
let appStateListeners: ((next: AppStateStatus) => void)[] = [];
let clock = 1_000_000;

async function appState(next: AppStateStatus) {
  await act(async () => {
    for (const listener of appStateListeners) listener(next);
  });
}

function lockOn(): AppLock {
  const values = new Map([[DEVICE_LOCK_KEY, "on"]]);
  return createAppLock({
    auth: {
      getEnrolledLevelAsync: async () => 3,
      authenticateAsync: async () => ({ success: true }),
    },
    store: {
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => void values.set(key, value),
      deleteItemAsync: async (key: string) => void values.delete(key),
    },
    accessible: 0,
    now: () => clock,
    isExempt: () => false,
    prompts: { unlock: "u", turnOn: "on", turnOff: "off" },
  });
}

let current: { app: FakeApp; api: ReturnType<typeof fakeApi> };

function Root() {
  return (
    <ThemeProvider scheme="light">
      <SessionProvider app={{ ...current.app.app, api: current.api.client }}>
        <ApiProvider client={current.api.client} queryClient={testQueryClient()} signedIn>
          <Stack screenOptions={{ headerShown: false }} />
        </ApiProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

async function openLocked(initialUrl: string) {
  const app = fakeApp({ status: "signedIn" }, { appLock: lockOn() });
  current = { app, api: fakeApi(routes(household())) };
  const router = await renderRouter(
    {
      _layout: Root,
      "(app)/_layout": signedInLayout,
      "(app)/(tabs)/_layout": TabsLayout,
      "(app)/(tabs)/index": HomeTab,
      "(app)/(tabs)/more": MoreTab,
      "(app)/(tabs)/accounts": () => null,
      "(app)/(tabs)/budget": () => null,
      "(app)/(tabs)/pay": () => null,
      "(app)/settings/index": SettingsRoute,
      "(app)/settings/data": SettingsDataRoute,
      "(app)/settings/phone": SettingsPhoneRoute,
      "(app)/check-in": () => null,
      "(app)/page/[key]": () => null,
      "(app)/+not-found": () => null,
    },
    { initialUrl },
  );
  // A cold start with the lock on: locked, then Unlock.
  expect(await screen.findByText(LOCKED.heading)).toBeOnTheScreen();
  await act(async () => fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock })));
  return { app, router };
}

describe("app lock with the signed-in routes", () => {
  beforeEach(() => {
    jest.useRealTimers();
    appStateListeners = [];
    clock = 1_000_000;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
      appStateListeners.push(handler as (next: AppStateStatus) => void);
      return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
    });
  });
  afterEach(() => jest.restoreAllMocks());

  it.each<AppStateStatus[]>([
    ["inactive", "active"],
    ["inactive", "background", "active"],
  ])("an export whose share sheet takes the app %s finishes on Data", async (...trip) => {
    const { app, router } = await openLocked("/settings/data");
    expect(router.getPathname()).toBe("/settings/data");
    let share: (outcome: "shared") => void = () => undefined;
    app.accountData.exportData.mockImplementationOnce(
      () => new Promise((resolve) => (share = resolve)),
    );
    await act(async () => fireEvent.press(screen.getByRole("button", { name: WEB_EXPORT.button })));
    // The share sheet is up: the app leaves the foreground, then comes back when it closes.
    for (const next of trip) await appState(next);
    await act(async () => share("shared"));
    expect(router.getPathname()).toBe("/settings/data");
    expect(screen.getByText(EXPORT.shared)).toBeOnTheScreen();
    expect(screen.queryByText(LOCKED.heading)).toBeNull();
  });

  it("a system sheet while unlocked keeps the page", async () => {
    const { router } = await openLocked("/settings/phone");
    await appState("inactive");
    await appState("active");
    expect(router.getPathname()).toBe("/settings/phone");
    expect(screen.getByRole("switch", { name: "App lock" })).toBeOnTheScreen();
  });

  it("unlocking after a timed lock comes back to the page the person was on", async () => {
    const { router } = await openLocked("/settings/phone");
    await appState("background");
    clock += LOCK_AFTER_MS;
    await appState("active");
    expect(screen.getByText(LOCKED.heading)).toBeOnTheScreen();
    expect(screen.queryByRole("switch", { name: "App lock" })).toBeNull();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock })));
    expect(router.getPathname()).toBe("/settings/phone");
    expect(screen.getByRole("switch", { name: "App lock" })).toBeOnTheScreen();
  });

  /** Away for the lock's time, then Unlock. */
  async function timedLockThenUnlock() {
    await appState("background");
    clock += LOCK_AFTER_MS;
    await appState("active");
    expect(screen.getByText(LOCKED.heading)).toBeOnTheScreen();
    await act(async () => fireEvent.press(screen.getByRole("button", { name: LOCKED.unlock })));
  }

  it("a page opened from More comes back on its stack: Back goes to Settings, then More with the tab bar", async () => {
    const { router } = await openLocked("/more");
    expect(await screen.findByLabelText("Main navigation")).toBeOnTheScreen();
    await act(async () => appRouter.push("/settings"));
    await act(async () => appRouter.push("/settings/phone"));
    expect(router.getPathname()).toBe("/settings/phone");
    await timedLockThenUnlock();
    expect(router.getPathname()).toBe("/settings/phone");
    expect(screen.getByRole("switch", { name: "App lock" })).toBeOnTheScreen();
    // The device check: Profile came back alone, with no Back, and system Back left the app.
    expect(appRouter.canGoBack()).toBe(true);
    await act(async () => appRouter.back());
    expect(router.getPathname()).toBe("/settings");
    await act(async () => appRouter.back());
    expect(router.getPathname()).toBe("/more");
    expect(screen.getByLabelText("Main navigation")).toBeOnTheScreen();
    // More was opened from Home, so Back from it is Home, as before the lock.
    await act(async () => appRouter.back());
    expect(router.getPathname()).toBe("/");
  });

  it("a tab comes back as that tab, with the tab bar", async () => {
    const { router } = await openLocked("/");
    expect(await screen.findByLabelText("Main navigation")).toBeOnTheScreen();
    await act(async () => appRouter.navigate("/accounts"));
    expect(router.getPathname()).toBe("/accounts");
    await timedLockThenUnlock();
    expect(router.getPathname()).toBe("/accounts");
    expect(screen.getByLabelText("Main navigation")).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: /Accounts/, selected: true })).toBeOnTheScreen();
  });

  it("signing out from the lock screen restores nothing for the next sign-in", async () => {
    const { app, router } = await openLocked("/settings/phone");
    await appState("background");
    clock += LOCK_AFTER_MS;
    await appState("active");
    await act(async () => {
      await app.app.appLock?.clear();
      app.set({ status: "signedOut", notice: null });
    });
    await act(async () => app.set({ status: "signedIn" }));
    expect(router.getPathname()).not.toBe("/settings/phone");
  });
});
