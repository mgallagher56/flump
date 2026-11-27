/**
 * Offline reading through the gate (E12 S7): a cold start with no connection shows the last saved
 * figures with their age, the cache is never read while the app lock covers the app, Try again and
 * the timer reconnect quietly, and back online every read is fetched again. The real offline cache
 * and the real Accounts screen, over an in-memory sealed store and the fake `/v1`.
 */
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { type AppLock, createAppLock } from "../../auth/deviceLock";
import { SessionProvider } from "../../auth/SessionProvider";
import { OFFLINE_HEADING } from "../../copy/auth";
import { SAVE_NEEDS_CONNECTION, SAVED_FIGURES } from "../../copy/offline";
import { ApiProvider } from "../../data/ApiProvider";
import type { CacheStore } from "../../data/cacheStore";
import { fail, fakeApi, testQueryClient } from "../../data/fakeApi";
import { CACHE_FORMAT, createOfflineCache, type OfflineCache } from "../../data/offlineCache";
import type { Connectivity } from "../../device/connectivity";
import { DEVICE_LOCK_KEY } from "../../device/storageKeys";
import { HOMEOWNER, personaHousehold } from "../../features/accounts/accountsTestData";
import { renterHousehold } from "../../features/budget/budgetTestData";
import { NOW, routes } from "../../features/check-in/checkInTestData";
import {
  AGE_CHECK_EVERY_MS,
  RECONNECT_EVERY_MS,
  RECONNECT_STEPS_MS,
} from "../../features/offline/useSavedFigures";
import { type FakeApp, fakeApp } from "../../testing/fakeAppSession";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AccountDetail } from "../AccountDetail";
import { Accounts } from "../Accounts";
import { Budget } from "../Budget";
import { OfflineReading } from "../OfflineReading";
import { SessionGate } from "./SessionGate";

const NOW_MS = NOW().getTime();
const OWNER = async () => "owner_hash_a";
const HOUR = 3_600_000;
const LINKS = {
  setUp: { url: "https://app.test.invalid/app/onboarding", exact: true },
};
// Own 427,000 less owe 195,600 (accountsTestData's home owner).
const TOTAL = "Total of the accounts listed, £231,400";

/** The sealed store as the cache sees it, already holding the home owner's figures. */
function savedStore(savedAt: number | null) {
  const h = personaHousehold(HOMEOWNER);
  const data = {
    accounts: h.accounts,
    accountDetails: h.details,
    userProfile: h.profile,
    checkIns: h.checkIns,
    budgetEntries: h.budgetEntries,
  };
  const text =
    savedAt === null
      ? null
      : JSON.stringify({
          format: CACHE_FORMAT,
          seenAt: savedAt,
          reads: Object.fromEntries(
            Object.entries(data).map(([name, value]) => [name, { savedAt, data: value }]),
          ),
        });
  const store: CacheStore = {
    read: jest.fn(async () => text),
    write: jest.fn(async () => {}),
    wipe: jest.fn(async () => true),
  };
  return { store, h };
}

/** Every read fails as it does offline with no token: nothing reaches Flump. */
const offlineApi = () =>
  fakeApi(
    Object.fromEntries(
      [
        "GET /accounts",
        "GET /account-details",
        "GET /user-profile",
        "GET /snapshots/check-ins",
        "GET /budget-entries",
      ].map((route) => [route, () => fail("unauthorised")]),
    ),
  );

async function start(app: FakeApp, api = offlineApi()) {
  const queryClient = testQueryClient();
  await render(
    <ThemeProvider scheme="light">
      <SessionProvider app={app.app}>
        <ApiProvider client={api.client} queryClient={queryClient}>
          <SessionGate>
            <OfflineReading now={() => NOW_MS}>
              <Accounts
                onSignOut={jest.fn()}
                onOpenAccount={jest.fn()}
                onAddAccount={jest.fn()}
                onAddEstimate={jest.fn()}
                onOpenHistory={jest.fn()}
                onOpenCheckIn={jest.fn()}
                onChangeWhatCounts={jest.fn()}
                marketingOrigin="https://m.test.invalid"
                links={LINKS}
                now={NOW}
              />
            </OfflineReading>
          </SessionGate>
        </ApiProvider>
      </SessionProvider>
    </ThemeProvider>,
  );
  return { queryClient, api };
}

const settle = () => act(async () => jest.advanceTimersByTimeAsync(0));

let appStateListeners: ((next: AppStateStatus) => void)[] = [];

// The first render in a file loads React Native's components and the engine (as Accounts.test).
beforeAll(async () => {
  const { store } = savedStore(NOW_MS - HOUR);
  const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
  await start(fakeApp({ status: "restoredOffline" }, { offlineCache: cache }));
  await screen.findByLabelText(TOTAL);
  screen.unmount();
}, 30_000);

beforeEach(() => {
  jest.useFakeTimers();
  appStateListeners = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
    appStateListeners.push(handler as (next: AppStateStatus) => void);
    return { remove: () => undefined } as ReturnType<typeof AppState.addEventListener>;
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("a cold start with no connection", () => {
  it("shows the last saved figures, marked with how long ago they were updated", async () => {
    const { store } = savedStore(NOW_MS - 2 * HOUR);
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    await start(fakeApp({ status: "restoredOffline" }, { offlineCache: cache }));
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    expect(screen.getByTestId("saved-figures-notice")).toHaveTextContent(
      `${SAVED_FIGURES.lastUpdated("2 hours ago")} ${SAVED_FIGURES.changes}`,
    );
    expect(screen.queryByText(OFFLINE_HEADING)).toBeNull();
  });

  it("with nothing saved, says it is offline, as before S7, and shows no figure", async () => {
    const { store } = savedStore(null);
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    await start(fakeApp({ status: "restoredOffline" }, { offlineCache: cache }));
    expect(await screen.findByText(OFFLINE_HEADING)).toBeOnTheScreen();
    expect(screen.queryByText(/£/)).toBeNull();
    expect(screen.queryByTestId("saved-figures-notice")).toBeNull();
  });

  it("with figures older than 7 days, says it is offline and shows none", async () => {
    const { store } = savedStore(NOW_MS - 8 * 24 * HOUR);
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    await start(fakeApp({ status: "restoredOffline" }, { offlineCache: cache }));
    expect(await screen.findByText(OFFLINE_HEADING)).toBeOnTheScreen();
    expect(screen.queryByText(/£/)).toBeNull();
  });

  it("online, never reads the cache and shows no notice", async () => {
    const { store, h } = savedStore(NOW_MS - HOUR);
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    await start(fakeApp({ status: "signedIn" }, { offlineCache: cache }), fakeApi(routes(h)));
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    expect(store.read).not.toHaveBeenCalled();
    expect(screen.queryByTestId("saved-figures-notice")).toBeNull();
  });
});

describe("the app lock and the cache", () => {
  let lockClock = 0;
  function lockWith(over: { pending?: boolean; level?: number }) {
    lockClock = 0;
    const values = new Map<string, string>([[DEVICE_LOCK_KEY, "on"]]);
    const lock: AppLock = createAppLock({
      auth: {
        getEnrolledLevelAsync: async () => over.level ?? 3,
        authenticateAsync: async () => ({ success: true }),
      },
      store: {
        getItemAsync: (key: string) =>
          over.pending
            ? new Promise<string | null>(() => {})
            : Promise.resolve(values.get(key) ?? null),
        setItemAsync: async (key: string, value: string) => void values.set(key, value),
        deleteItemAsync: async (key: string) => void values.delete(key),
      },
      accessible: 0,
      now: () => lockClock,
      isExempt: () => false,
      prompts: { unlock: "u", turnOn: "on", turnOff: "off" },
    });
    return lock;
  }

  const appState = (next: AppStateStatus) =>
    act(async () => {
      for (const listener of appStateListeners) listener(next);
    });

  it.each([
    ["checking", { pending: true }],
    ["locked", {}],
    ["noScreenLock", { level: 0 }],
  ] as const)(
    "while %s, the cache is never read and no figure is rendered",
    async (phase, over) => {
      const { store } = savedStore(NOW_MS - HOUR);
      const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
      const lock = lockWith(over);
      await start(fakeApp({ status: "restoredOffline" }, { appLock: lock, offlineCache: cache }));
      await settle();
      expect(lock.getPhase()).toBe(phase);
      expect(store.read).not.toHaveBeenCalled();
      expect(screen.queryByText(/£/, { includeHiddenElements: true })).toBeNull();
    },
  );

  it("is read only once Unlock uncovers the shell", async () => {
    const { store } = savedStore(NOW_MS - HOUR);
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    const lock = lockWith({});
    await start(fakeApp({ status: "restoredOffline" }, { appLock: lock, offlineCache: cache }));
    await settle();
    expect(store.read).not.toHaveBeenCalled();
    await act(async () => {
      await lock.unlock();
    });
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    expect(store.read).toHaveBeenCalledTimes(1);
  });

  it("is not read under the iOS app switcher cover; read once the app is in front", async () => {
    const { store } = savedStore(NOW_MS - HOUR);
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    const lock = lockWith({});
    await start(fakeApp({ status: "restoredOffline" }, { appLock: lock, offlineCache: cache }));
    await settle();
    // Unlocked while the app is away (a system sheet): the cover goes over the shell.
    await appState("inactive");
    await act(async () => {
      await lock.unlock();
    });
    expect(screen.getByTestId("app-switcher-cover")).toBeOnTheScreen();
    await settle();
    expect(store.read).not.toHaveBeenCalled();
    await appState("active");
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    expect(store.read).toHaveBeenCalledTimes(1);
  });

  it("a lock that comes on while the file is read puts nothing into memory; read again after Unlock", async () => {
    const { store } = savedStore(NOW_MS - HOUR);
    const original = (store.read as jest.Mock).getMockImplementation();
    let release: () => void = () => {};
    (store.read as jest.Mock).mockImplementationOnce(
      (owner: string) =>
        new Promise((resolve) => {
          release = () => resolve(original?.(owner));
        }),
    );
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    const lock = lockWith({});
    const app = fakeApp({ status: "restoredOffline" }, { appLock: lock, offlineCache: cache });
    const { queryClient } = await start(app);
    await act(async () => {
      await lock.unlock();
    });
    await settle();
    expect(store.read).toHaveBeenCalledTimes(1);
    // Away for more than a minute: locked again, while the read is still running.
    await appState("background");
    lockClock = 61_000;
    await appState("active");
    expect(lock.getPhase()).toBe("locked");
    await act(async () => release());
    await settle();
    expect(queryClient.getQueryData(["flump", "accounts"])).toBeUndefined();
    expect(screen.queryByText(/£/, { includeHiddenElements: true })).toBeNull();
    await act(async () => {
      await lock.unlock();
    });
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    expect(store.read).toHaveBeenCalledTimes(2);
  });
});

describe("the age limit while on screen", () => {
  it("once figures are forgotten for their age, reconnects start again from 5 seconds", async () => {
    let clock = NOW_MS;
    const savedAt = NOW_MS - 7 * 24 * HOUR + 60_000;
    const { store } = savedStore(savedAt);
    const cache = createOfflineCache({ store, now: () => clock, owner: OWNER });
    const app = fakeApp({ status: "restoredOffline" }, { offlineCache: cache });
    await start(app);
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    // Long enough on screen that the steps reached 30 seconds.
    await act(async () => jest.advanceTimersByTimeAsync(5_000 + 10_000 + 20_000));
    clock = NOW_MS + 2 * 60_000;
    await act(async () => {
      for (const listener of appStateListeners) listener("active");
    });
    expect(screen.getByText(OFFLINE_HEADING)).toBeOnTheScreen();
    const after = app.session.reconnect.mock.calls.length;
    await act(async () => jest.advanceTimersByTimeAsync(5_000));
    expect(app.session.reconnect.mock.calls.length).toBe(after + 1);
  });

  it("past 7 days, the figures are forgotten and the offline screen takes their place", async () => {
    let clock = NOW_MS;
    // Saved 6 days 23 hours 59 minutes ago.
    const savedAt = NOW_MS - 7 * 24 * HOUR + 60_000;
    const { store } = savedStore(savedAt);
    const cache = createOfflineCache({ store, now: () => clock, owner: OWNER });
    const { queryClient } = await start(
      fakeApp({ status: "restoredOffline" }, { offlineCache: cache }),
    );
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    // Two minutes later: 7 days and 1 minute old.
    clock = NOW_MS + 2 * 60_000;
    await act(async () => jest.advanceTimersByTimeAsync(AGE_CHECK_EVERY_MS));
    expect(screen.queryByText(/£/)).toBeNull();
    expect(screen.getByText(OFFLINE_HEADING)).toBeOnTheScreen();
    expect(queryClient.getQueryData(["flump", "accounts"])).toBeUndefined();
    expect(store.wipe).toHaveBeenCalled();
  });

  it("with the clock turned back while on screen, the figures go too", async () => {
    let clock = NOW_MS;
    const { store } = savedStore(NOW_MS - HOUR);
    const cache = createOfflineCache({ store, now: () => clock, owner: OWNER });
    await start(fakeApp({ status: "restoredOffline" }, { offlineCache: cache }));
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    clock = NOW_MS - 2 * HOUR;
    await act(async () => jest.advanceTimersByTimeAsync(AGE_CHECK_EVERY_MS));
    expect(screen.queryByText(/£/)).toBeNull();
  });

  it("on returning to the front (iOS stops timers in the background), the age is checked at once", async () => {
    let clock = NOW_MS;
    const savedAt = NOW_MS - 7 * 24 * HOUR + 60_000;
    const { store } = savedStore(savedAt);
    const cache = createOfflineCache({ store, now: () => clock, owner: OWNER });
    await start(fakeApp({ status: "restoredOffline" }, { offlineCache: cache }));
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    // Away for an hour with no timer running; back in front before any minute tick.
    clock = NOW_MS + HOUR;
    await act(async () => {
      for (const listener of appStateListeners) listener("active");
    });
    expect(screen.queryByText(/£/)).toBeNull();
    expect(screen.getByText(OFFLINE_HEADING)).toBeOnTheScreen();
  });

  it("within 7 days, the figures stay", async () => {
    let clock = NOW_MS;
    const { store } = savedStore(NOW_MS - HOUR);
    const cache = createOfflineCache({ store, now: () => clock, owner: OWNER });
    await start(fakeApp({ status: "restoredOffline" }, { offlineCache: cache }));
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    clock = NOW_MS + HOUR;
    await act(async () => jest.advanceTimersByTimeAsync(AGE_CHECK_EVERY_MS));
    expect(screen.getByLabelText(TOTAL)).toBeOnTheScreen();
  });
});

describe("coming back online", () => {
  async function offlineWithFigures() {
    const { store, h } = savedStore(NOW_MS - HOUR);
    const cache: OfflineCache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    const app = fakeApp({ status: "restoredOffline" }, { offlineCache: cache });
    // Offline first: every read fails; the same routes answer once the session is back.
    let online = false;
    const live = fakeApi(
      Object.fromEntries(
        Object.entries(routes(h)).map(([route, answer]) => [
          route,
          (body: unknown) => (online ? answer(body) : fail("unauthorised")),
        ]),
      ),
    );
    const rendered = await start(app, live);
    expect(await screen.findByLabelText(TOTAL)).toBeOnTheScreen();
    return {
      app,
      live,
      ...rendered,
      goOnline: () => {
        online = true;
      },
    };
  }

  it("Try again reconnects quietly: the figures stay while it runs", async () => {
    const { app } = await offlineWithFigures();
    let finish: () => void = () => {};
    app.session.reconnect.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await fireEvent.press(screen.getByRole("button", { name: SAVED_FIGURES.tryAgain }));
    expect(app.session.reconnect).toHaveBeenCalledTimes(1);
    expect(app.session.retry).not.toHaveBeenCalled();
    expect(screen.getByLabelText(TOTAL)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: SAVED_FIGURES.tryAgain })).toBeBusy();
    await act(async () => finish());
  });

  it("tries a quiet reconnect after 5, 10, 20, then every 30 seconds, and on returning to the front", async () => {
    expect(RECONNECT_STEPS_MS).toEqual([5_000, 10_000, 20_000, 30_000]);
    const { app } = await offlineWithFigures();
    const calls = () => app.session.reconnect.mock.calls.length;
    const start = calls();
    await act(async () => jest.advanceTimersByTimeAsync(4_999));
    expect(calls()).toBe(start);
    await act(async () => jest.advanceTimersByTimeAsync(1));
    expect(calls()).toBe(start + 1);
    await act(async () => jest.advanceTimersByTimeAsync(10_000));
    expect(calls()).toBe(start + 2);
    await act(async () => jest.advanceTimersByTimeAsync(20_000));
    expect(calls()).toBe(start + 3);
    await act(async () => jest.advanceTimersByTimeAsync(RECONNECT_EVERY_MS));
    expect(calls()).toBe(start + 4);
    await act(async () => jest.advanceTimersByTimeAsync(RECONNECT_EVERY_MS));
    expect(calls()).toBe(start + 5);
    const before = calls();
    await act(async () => {
      for (const listener of appStateListeners) listener("active");
    });
    expect(app.session.reconnect.mock.calls.length).toBe(before + 2);
  });

  it("once signed in again, the notice goes and every read is fetched again at once", async () => {
    const { app, live, goOnline } = await offlineWithFigures();
    goOnline();
    const calls = live.calls.length;
    await act(async () => app.set({ status: "signedIn" }));
    await settle();
    expect(screen.queryByTestId("saved-figures-notice")).toBeNull();
    const fetched = live.calls.slice(calls).map((c) => c.path);
    expect(fetched).toEqual(
      expect.arrayContaining(["/accounts", "/account-details", "/user-profile"]),
    );
    expect(screen.getByLabelText(TOTAL)).toBeOnTheScreen();
  });

  it("stops the timer once signed in again", async () => {
    const { app } = await offlineWithFigures();
    await act(async () => app.set({ status: "signedIn" }));
    const calls = app.session.reconnect.mock.calls.length;
    await act(async () => jest.advanceTimersByTimeAsync(RECONNECT_EVERY_MS * 2));
    expect(app.session.reconnect.mock.calls.length).toBe(calls);
  });
});

describe("an account's page from saved figures", () => {
  async function accountPage(status: "restoredOffline" | "signedIn") {
    const { store, h } = savedStore(NOW_MS - HOUR);
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    const app = fakeApp({ status }, { offlineCache: cache });
    const id = h.accounts[0]?.id ?? "";
    await render(
      <ThemeProvider scheme="light">
        <SessionProvider app={app.app}>
          <ApiProvider
            client={(status === "signedIn" ? fakeApi(routes(h)) : offlineApi()).client}
            queryClient={testQueryClient()}
          >
            <SessionGate>
              <OfflineReading now={() => NOW_MS}>
                <AccountDetail
                  id={id}
                  onSignOut={jest.fn()}
                  marketingOrigin="https://m.test.invalid"
                  links={{ setUp: LINKS.setUp, mortgage: LINKS.setUp, debts: LINKS.setUp }}
                  onBackToAccounts={jest.fn()}
                  onEdit={jest.fn()}
                  now={NOW}
                />
              </OfflineReading>
            </SessionGate>
          </ApiProvider>
        </SessionProvider>
      </ThemeProvider>,
    );
    expect(await screen.findByTestId("account-detail-hero")).toBeOnTheScreen();
  }

  it("offline: no quick balance update and no Edit, since both write", async () => {
    await accountPage("restoredOffline");
    expect(screen.getByTestId("saved-figures-notice")).toBeOnTheScreen();
    expect(screen.queryByTestId("quick-balance-open")).toBeNull();
    expect(screen.queryByTestId("account-edit")).toBeNull();
  });

  it("online: both are there", async () => {
    await accountPage("signedIn");
    expect(screen.getByTestId("quick-balance-open")).toBeOnTheScreen();
    expect(screen.getByTestId("account-edit")).toBeOnTheScreen();
  });
});

describe("the Budget from saved figures (E12 S10)", () => {
  /** The renter's budget, sealed an hour ago, as the cache holds it. */
  function savedBudget() {
    const h = renterHousehold();
    const savedAt = NOW_MS - HOUR;
    const data = {
      accounts: h.accounts,
      accountDetails: h.details,
      userProfile: h.profile,
      checkIns: h.checkIns,
      budgetEntries: h.budgetEntries,
    };
    const text = JSON.stringify({
      format: CACHE_FORMAT,
      seenAt: savedAt,
      reads: Object.fromEntries(
        Object.entries(data).map(([name, value]) => [name, { savedAt, data: value }]),
      ),
    });
    const store: CacheStore = {
      read: jest.fn(async () => text),
      write: jest.fn(async () => {}),
      wipe: jest.fn(async () => true),
    };
    return { store, h };
  }

  async function budgetPage(status: "restoredOffline" | "signedIn") {
    const { store, h } = savedBudget();
    const cache = createOfflineCache({ store, now: () => NOW_MS, owner: OWNER });
    const app = fakeApp({ status }, { offlineCache: cache });
    const api = status === "signedIn" ? fakeApi(routes(h)) : offlineApi();
    await render(
      <ThemeProvider scheme="light">
        <SessionProvider app={app.app}>
          <ApiProvider client={api.client} queryClient={testQueryClient()}>
            <SessionGate>
              <OfflineReading now={() => NOW_MS}>
                <Budget
                  onSignOut={jest.fn()}
                  marketingOrigin="https://m.test.invalid"
                  links={{
                    setUp: LINKS.setUp,
                    budget: LINKS.setUp,
                    mortgage: LINKS.setUp,
                    salary: LINKS.setUp,
                  }}
                  onOpenAccounts={jest.fn()}
                  now={NOW}
                />
              </OfflineReading>
            </SessionGate>
          </ApiProvider>
        </SessionProvider>
      </ThemeProvider>,
    );
    // The renter by hand (plan 9.8b): 2,085 in; 1,615 + 195 + 150 = 1,960 out; 125 left over.
    expect(await screen.findByLabelText(/^Left over each month, £125, /)).toBeOnTheScreen();
    return api;
  }

  it("offline: the saved figures with their age, and no Edit budget, editor or switch", async () => {
    const api = await budgetPage("restoredOffline");
    expect(screen.getByTestId("saved-figures-notice")).toBeOnTheScreen();
    expect(screen.getByText(/£2,085/)).toBeOnTheScreen();
    expect(screen.getByText(/£1,960/)).toBeOnTheScreen();
    expect(screen.queryByTestId("budget-categories-edit")).toBeNull();
    expect(screen.queryByTestId("budget-entry-sheet")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Show what counts" }));
    await settle();
    for (const row of screen.getAllByRole("switch")) {
      expect(row.props.accessibilityState).toMatchObject({ disabled: true });
    }
    // The what-if zone stays: it sends nothing.
    expect(screen.getByTestId("runway")).toBeOnTheScreen();
    expect(api.calls.some((c) => c.method !== "GET")).toBe(false);
  });

  it("online: Edit budget and the own entries' switches are there", async () => {
    await budgetPage("signedIn");
    expect(screen.queryByTestId("saved-figures-notice")).toBeNull();
    expect(screen.getByTestId("budget-categories-edit")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Show what counts" }));
    await settle();
    expect(
      screen.getByRole("switch", { name: "Eating out" }).props.accessibilityState,
    ).toMatchObject({ disabled: false });
  });
});

describe("the connection drops mid-session (E12 S7 follow-up)", () => {
  /** The phone's connection signal, pushed by the test. */
  function phoneNetwork() {
    let listener: ((online: boolean) => void) | null = null;
    const connectivity: Connectivity = {
      subscribe: (next) => {
        listener = next;
        return () => {
          listener = null;
        };
      },
    };
    return { connectivity, push: (online: boolean) => act(async () => listener?.(online)) };
  }

  /** Signed in and online, on the Budget, with figures sealed an hour ago as reads do. */
  async function onlineBudget({ file = true, cacheBuilt = true } = {}) {
    // The live reads happen now, so their own time is NOW_MS.
    jest.setSystemTime(NOW_MS);
    const h = renterHousehold();
    const savedAt = NOW_MS - HOUR;
    const text = JSON.stringify({
      format: CACHE_FORMAT,
      seenAt: savedAt,
      reads: {
        accounts: { savedAt, data: h.accounts },
        accountDetails: { savedAt, data: h.details },
        userProfile: { savedAt, data: h.profile },
        checkIns: { savedAt, data: h.checkIns },
        budgetEntries: { savedAt, data: h.budgetEntries },
      },
    });
    const store: CacheStore = {
      read: jest.fn(async () => (file ? text : null)),
      write: jest.fn(async () => {}),
      wipe: jest.fn(async () => true),
    };
    const cache = cacheBuilt
      ? createOfflineCache({ store, now: () => NOW_MS, owner: OWNER })
      : undefined;
    const net = phoneNetwork();
    const app = fakeApp(
      { status: "signedIn" },
      { offlineCache: cache, connectivity: net.connectivity },
    );
    const post = jest.fn((body: unknown) => ({
      ...(h.budgetEntries[2] as object),
      ...(body as object),
      id: "6f1c2a8e-0000-4000-8000-000000000001",
    }));
    const api = fakeApi(routes(h, { "POST /budget-entries": post }));
    await render(
      <ThemeProvider scheme="light">
        <SessionProvider app={app.app}>
          <ApiProvider client={api.client} queryClient={testQueryClient()}>
            <SessionGate>
              <OfflineReading now={() => NOW_MS}>
                <Budget
                  onSignOut={jest.fn()}
                  marketingOrigin="https://m.test.invalid"
                  links={{
                    setUp: LINKS.setUp,
                    budget: LINKS.setUp,
                    mortgage: LINKS.setUp,
                    salary: LINKS.setUp,
                  }}
                  onOpenAccounts={jest.fn()}
                  now={NOW}
                />
              </OfflineReading>
            </SessionGate>
          </ApiProvider>
        </SessionProvider>
      </ThemeProvider>,
    );
    expect(await screen.findByLabelText(/^Left over each month, £125, /)).toBeOnTheScreen();
    return { app, net, store, post };
  }

  /** Edit budget, Add to bills, and a name and amount typed but not saved. */
  async function typeUnsavedEntry() {
    await fireEvent.press(screen.getByRole("button", { name: "Edit budget" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add to bills" }));
    await fireEvent.changeText(screen.getByLabelText(/^Name/), "Water");
    await fireEvent.changeText(screen.getByLabelText(/^Amount/), "25");
    await settle();
  }

  it("at once shows the start-up offline state: the notice with the age, no editing", async () => {
    const { app, net } = await onlineBudget();
    expect(screen.getByTestId("budget-categories-edit")).toBeOnTheScreen();
    await net.push(false);
    await settle();
    expect(app.session.connectionLost).toHaveBeenCalledTimes(1);
    // The figures in memory were fetched just now, newer than the file's: their own time is shown
    // (the cache keeps a fresher answer and its time, as it does at start-up).
    expect(screen.getByTestId("saved-figures-notice")).toHaveTextContent(
      `${SAVED_FIGURES.lastUpdated("just now")} ${SAVED_FIGURES.changes}`,
    );
    // The figures stay on screen; the ways in to editing go.
    expect(screen.getByLabelText(/^Left over each month, £125, /)).toBeOnTheScreen();
    expect(screen.queryByTestId("budget-categories-edit")).toBeNull();
  });

  it("back online, tries the reconnect at once and, signed in again, brings editing back", async () => {
    const { app, net } = await onlineBudget();
    await net.push(false);
    await settle();
    const before = app.session.reconnect.mock.calls.length;
    await net.push(true);
    // At once, and once more after it (in case it joined a timed one already running).
    expect(app.session.reconnect.mock.calls.length).toBe(before + 2);
    await act(async () => app.set({ status: "signedIn" }));
    await settle();
    expect(screen.queryByTestId("saved-figures-notice")).toBeNull();
    expect(screen.getByTestId("budget-categories-edit")).toBeOnTheScreen();
  });

  it("an open sheet keeps what was typed, says saving needs a connection, and saves once back", async () => {
    const { app, net, post } = await onlineBudget();
    await typeUnsavedEntry();
    await net.push(false);
    await settle();
    expect(screen.getByTestId("budget-entry-sheet")).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Name/).props.value).toBe("Water");
    expect(screen.getByTestId("budget-entry-form-offline")).toHaveTextContent(
      SAVE_NEEDS_CONNECTION,
    );
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(save);
    await settle();
    expect(post).not.toHaveBeenCalled();

    await act(async () => app.set({ status: "signedIn" }));
    await settle();
    expect(screen.queryByTestId("budget-entry-form-offline")).toBeNull();
    expect(screen.getByLabelText(/^Name/).props.value).toBe("Water");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await settle();
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ name: "Water", amount: 25 }));
  });

  it.each([
    ["no sealed file yet", { file: false }],
    ["no offline cache on this phone", { cacheBuilt: false }],
  ])(
    "with %s, the figures in memory stay under the notice, and an open sheet with them",
    async (_name, over) => {
      const { net } = await onlineBudget(over);
      await typeUnsavedEntry();
      await net.push(false);
      await settle();
      expect(screen.queryByText(OFFLINE_HEADING)).toBeNull();
      expect(screen.getByTestId("saved-figures-notice")).toHaveTextContent(
        `${SAVED_FIGURES.lastUpdated("just now")} ${SAVED_FIGURES.changes}`,
      );
      expect(screen.getByLabelText(/^Name/).props.value).toBe("Water");
    },
  );

  it("leaves the sealed file as it was: a drop neither wipes nor rewrites what is cached", async () => {
    const { store, net } = await onlineBudget();
    const writes = (store.write as jest.Mock).mock.calls.length;
    await net.push(false);
    await settle();
    expect(store.wipe).not.toHaveBeenCalled();
    // The restore puts back only the latest time seen, with the same reads and saved times.
    const after = (store.write as jest.Mock).mock.calls
      .slice(writes)
      .map(([text]) => JSON.parse(text));
    for (const envelope of after) {
      expect(Object.values(envelope.reads).map((r) => (r as { savedAt: number }).savedAt)).toEqual(
        Array(5).fill(NOW_MS - HOUR),
      );
    }
  });
});
