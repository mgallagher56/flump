import { userEvent } from "@testing-library/react-native";
import { router as appRouter, Stack } from "expo-router";
import { act, renderRouter, screen, testRouter } from "expo-router/testing-library";
import { Linking } from "react-native";
import * as signedInLayout from "../../app/(app)/_layout";
import TabsLayout from "../../app/(app)/(tabs)/_layout";
import AccountsTab from "../../app/(app)/(tabs)/accounts";
import BudgetTab from "../../app/(app)/(tabs)/budget";
import HomeTab from "../../app/(app)/(tabs)/index";
import MoreTab from "../../app/(app)/(tabs)/more";
import PayTab from "../../app/(app)/(tabs)/pay";
import MorePageRoute from "../../app/(app)/page/[key]";
import { type AppSession, SessionProvider } from "../auth/SessionProvider";
import type { Session } from "../auth/session";
import type { SessionState } from "../auth/sessionMachine";
import { Text } from "../components/Text";
import { ApiProvider } from "../data/ApiProvider";
import type { ApiClient } from "../data/apiClient";
import { fakeApi, testQueryClient } from "../data/fakeApi";
import { household, routes } from "../features/check-in/checkInTestData";
import { ThemeProvider } from "../theme/ThemeProvider";

/**
 * The signed-in routes as the app wires them (E12 S4, plan 9.7): the real route files under a root
 * that holds a fake session, so the tabs, the More list, `flump://` links and the session states
 * are tested together. The check-in route is a stand-in; it has its own tests.
 */
function fakeSession(initial: SessionState) {
  let state = initial;
  const listeners = new Set<(s: SessionState) => void>();
  const session = {
    getState: () => state,
    subscribe: (l: (s: SessionState) => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    restore: jest.fn(async () => {}),
    retry: jest.fn(async () => {}),
    signIn: jest.fn(async () => {}),
    signOut: jest.fn(async () => {}),
    getAccessToken: () => null,
    refresh: jest.fn(),
  };
  const set = (next: SessionState) => {
    state = next;
    for (const l of listeners) l(state);
  };
  return { session: session as unknown as Session & typeof session, set };
}

/** What the test root holds; set by `openApp` before each render. */
let current: {
  app: AppSession;
  client: ApiClient;
  queryClient: ReturnType<typeof testQueryClient>;
};

function Root() {
  return (
    <ThemeProvider scheme="light">
      <SessionProvider app={current.app}>
        <ApiProvider client={current.client} queryClient={current.queryClient} signedIn>
          <Stack screenOptions={{ headerShown: false }} />
        </ApiProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

async function openApp(initialUrl: string, initial: SessionState = { status: "signedIn" }) {
  const app = fakeSession(initial);
  const api = fakeApi(routes(household()));
  current = {
    app: {
      session: app.session,
      api: api.client,
      marketingOrigin: "https://site.test.invalid",
      webAppOrigin: "https://app.test.invalid",
    },
    client: api.client,
    queryClient: testQueryClient(),
  };
  const router = await renderRouter(
    {
      _layout: Root,
      "(app)/_layout": signedInLayout,
      "(app)/(tabs)/_layout": TabsLayout,
      "(app)/(tabs)/index": HomeTab,
      "(app)/(tabs)/accounts": AccountsTab,
      "(app)/(tabs)/budget": BudgetTab,
      "(app)/(tabs)/pay": PayTab,
      "(app)/(tabs)/more": MoreTab,
      "(app)/page/[key]": MorePageRoute,
      "(app)/check-in": () => <Text>Check-in stand-in</Text>,
    },
    { initialUrl },
  );
  return { app, router };
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("the signed-in routes", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it("opens on Home with the tab bar, Home selected", async () => {
    const { router } = await openApp("/");
    expect(router.getPathname()).toBe("/");
    expect(await screen.findByRole("header", { name: "You are signed in" })).toBeOnTheScreen();
    expect(screen.getAllByRole("tab").map((t) => t.props.testID)).toEqual([
      "tab-home",
      "tab-accounts",
      "tab-budget",
      "tab-taxAndPay",
      "tab-more",
    ]);
    expect(tab("Home").props.accessibilityState).toMatchObject({ selected: true });
  });

  it.each([
    ["Accounts", "/accounts", "https://app.test.invalid/app/accounts"],
    ["Budget", "/budget", "https://app.test.invalid/app/budget"],
    ["Pay", "/pay", "https://app.test.invalid/app/take-home"],
  ])("the %s tab is a plain placeholder linking to the same web page", async (name, path, url) => {
    const { router } = await openApp("/");
    const user = userEvent.setup();
    await user.press(tab(name));
    expect(router.getPathname()).toBe(path);
    expect(tab(name).props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByRole("header", { name })).toBeOnTheScreen();
    expect(screen.getByText(`${name} is not in the app yet. You can use it on the Flump website.`));
    await user.press(screen.getByRole("link", { name: `Open ${name} on the website` }));
    expect(Linking.openURL).toHaveBeenCalledWith(url);
  });

  it("the header's menu button opens More, which has no menu button of its own", async () => {
    const { router } = await openApp("/budget");
    await userEvent.setup().press(screen.getByRole("button", { name: "Open navigation menu" }));
    expect(router.getPathname()).toBe("/more");
    expect(tab("More").props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByRole("button", { name: "Open navigation menu" })).toBeNull();
  });

  it("a More row opens its page, which links to the same web page", async () => {
    const { router } = await openApp("/more");
    const user = userEvent.setup();
    await user.press(screen.getByRole("link", { name: "Connect AI" }));
    expect(router.getPathname()).toBe("/page/connectAi");
    await user.press(screen.getByRole("link", { name: "Open Connect AI on the website" }));
    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://app.test.invalid/app/profile?tab=ai_connections",
    );
  });

  it.each([
    ["/accounts", "Accounts"],
    ["/more", "More"],
  ])("flump:/%s opens that tab", async (url, name) => {
    await openApp(url);
    expect(tab(name).props.accessibilityState).toMatchObject({ selected: true });
  });

  it("flump://page/pension opens the Pension page", async () => {
    const { router } = await openApp("/page/pension");
    expect(router.getPathname()).toBe("/page/pension");
    expect(
      screen.getByText("Pension is not in the app yet. You can use it on the Flump website."),
    ).toBeOnTheScreen();
    // Opened cold, the tabs are still beneath it: Back goes to them, not out of the app.
    expect(testRouter.canGoBack()).toBe(true);
    await act(async () => appRouter.back());
    expect(screen.queryByText(/Pension is not in the app yet/)).toBeNull();
    expect(tab("Home").props.accessibilityState).toMatchObject({ selected: true });
  });

  it("an unknown page says so and offers one way back, to More", async () => {
    const { router } = await openApp("/page/nope");
    expect(screen.getByRole("header", { name: "We could not find that page" })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Go to More" }));
    expect(router.getPathname()).toBe("/more");
  });

  it("a link opened signed out shows sign-in, then its own screen once signed in", async () => {
    const { app, router } = await openApp("/page/pension", { status: "signedOut", notice: null });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
    expect(screen.queryByRole("tab")).toBeNull();
    await act(async () => app.set({ status: "signedIn" }));
    expect(router.getPathname()).toBe("/page/pension");
    expect(screen.getByText(/Pension is not in the app yet/)).toBeOnTheScreen();
  });

  it("restored offline: the tabs stay, Home says so with Try again, More still works", async () => {
    const { app } = await openApp("/", { status: "restoredOffline" });
    const user = userEvent.setup();
    expect(screen.getByRole("header", { name: "We could not reach Flump" })).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Try again" }));
    expect(app.session.retry).toHaveBeenCalledTimes(1);
    await user.press(tab("More"));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
  });

  it.each<[SessionState, string]>([
    [{ status: "sessionEnded" }, "You have been signed out"],
    [{ status: "notInvited" }, "This account has not been invited yet"],
    [{ status: "termsRequired" }, "Please agree to our terms on the website"],
  ])("%j replaces the tabs with its own screen", async (state, heading) => {
    const { app } = await openApp("/accounts");
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    await act(async () => app.set(state));
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("header", { name: heading })).toBeOnTheScreen();
  });

  it("Sign out in More asks first, then signs out", async () => {
    const alert = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation(() => {}) as jest.SpyInstance;
    const { app } = await openApp("/more");
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(alert.mock.calls[0]?.[0]).toBe("Sign out of Flump?");
    const buttons = (alert.mock.calls[0]?.[2] ?? []) as { text: string; onPress?: () => void }[];
    await act(async () => buttons.find((b) => b.text === "Sign out")?.onPress?.());
    expect(app.session.signOut).toHaveBeenCalledTimes(1);
  });

  it("the check-in row on Home opens the check-in", async () => {
    const { router } = await openApp("/");
    const action = await screen.findByTestId("check-in-row-action", {}, { timeout: 3000 });
    await userEvent.setup().press(action);
    expect(router.getPathname()).toBe("/check-in");
  });
});
