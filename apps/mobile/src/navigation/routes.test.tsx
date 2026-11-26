import { userEvent } from "@testing-library/react-native";
import { router as appRouter, type Href, Stack } from "expo-router";
import { act, renderRouter, screen, testRouter } from "expo-router/testing-library";
import { Linking } from "react-native";
import * as signedInLayout from "../../app/(app)/_layout";
import NotFoundRoute from "../../app/(app)/+not-found";
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
import { signOutConfirmMessage } from "../copy/auth";
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
      "(app)/+not-found": NotFoundRoute,
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
    expect(
      screen.getByText("This page is not in the app yet. You can use it on the Flump website."),
    ).toBeOnTheScreen();
    await user.press(screen.getByRole("link", { name: `Open ${name} on the website` }));
    expect(Linking.openURL).toHaveBeenCalledWith(url);
  });

  it("the header's menu button opens More, which has no menu button of its own", async () => {
    const { router } = await openApp("/budget");
    await userEvent.setup().press(screen.getByRole("button", { name: "Open More" }));
    expect(router.getPathname()).toBe("/more");
    expect(tab("More").props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByRole("button", { name: "Open More" })).toBeNull();
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
      screen.getByText("This page is not in the app yet. You can use it on the Flump website."),
    ).toBeOnTheScreen();
    // Opened cold, the tabs are still beneath it: Back goes to them, not out of the app.
    expect(testRouter.canGoBack()).toBe(true);
    await act(async () => appRouter.back());
    expect(screen.queryByText(/This page is not in the app yet/)).toBeNull();
    expect(tab("Home").props.accessibilityState).toMatchObject({ selected: true });
  });

  it("an unknown page says so and offers one way back, to More", async () => {
    const { router } = await openApp("/page/nope");
    expect(screen.getByRole("header", { name: "We could not find that page" })).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Go to More" }));
    expect(router.getPathname()).toBe("/more");
  });

  describe("a link the app does not know", () => {
    const ownPage = () =>
      expect(screen.getByText("The link may be old or mistyped.")).toBeOnTheScreen();
    const noRouterPage = () => {
      expect(screen.queryByText(/Unmatched Route/)).toBeNull();
      expect(screen.queryByText(/Sitemap/)).toBeNull();
    };

    it("cold: its own page inside the app, with one way back, to Home", async () => {
      const { router } = await openApp("/nope");
      ownPage();
      noRouterPage();
      expect(screen.getAllByRole("button", { name: /Go to/ })).toHaveLength(1);
      await userEvent.setup().press(screen.getByRole("button", { name: "Go to Home" }));
      expect(router.getPathname()).toBe("/");
      expect(tab("Home").props.accessibilityState).toMatchObject({ selected: true });
    });

    it("warm: opened while the app is on a tab, the same page, and Back returns to the tab", async () => {
      await openApp("/budget");
      // An unknown path is, by definition, not one of the typed routes.
      await act(async () => appRouter.push("/nope/deeper" as unknown as Href));
      ownPage();
      noRouterPage();
      await act(async () => appRouter.back());
      expect(tab("Budget").props.accessibilityState).toMatchObject({ selected: true });
    });

    it.each<[SessionState, string]>([
      [{ status: "signedOut", notice: null }, "Sign in"],
      [{ status: "sessionEnded" }, "You have been signed out"],
      [{ status: "notInvited" }, "This account has not been invited yet"],
      [{ status: "termsRequired" }, "Please agree to our terms on the website"],
    ])("cold, %j: the gate's screen comes first, never the page", async (state, shown) => {
      await openApp("/nope", state);
      expect(screen.getAllByText(shown).length).toBeGreaterThan(0);
      expect(screen.queryByText("The link may be old or mistyped.")).toBeNull();
      noRouterPage();
    });

    it.each<[SessionState, string]>([
      [{ status: "sessionEnded" }, "You have been signed out"],
      [{ status: "termsRequired" }, "Please agree to our terms on the website"],
    ])("warm, then %j: the gate's screen replaces the page", async (state, heading) => {
      const { app } = await openApp("/nope");
      ownPage();
      await act(async () => app.set(state));
      expect(screen.getByRole("header", { name: heading })).toBeOnTheScreen();
      expect(screen.queryByText("The link may be old or mistyped.")).toBeNull();
    });

    it("restored offline: the page still shows, it needs no data", async () => {
      await openApp("/nope", { status: "restoredOffline" });
      ownPage();
    });

    it("signed out, then signed in: lands on the page", async () => {
      const { app } = await openApp("/nope", { status: "signedOut", notice: null });
      await act(async () => app.set({ status: "signedIn" }));
      ownPage();
    });
  });

  it("a link opened signed out shows sign-in, then its own screen once signed in", async () => {
    const { app, router } = await openApp("/page/pension", { status: "signedOut", notice: null });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
    expect(screen.queryByRole("tab")).toBeNull();
    await act(async () => app.set({ status: "signedIn" }));
    expect(router.getPathname()).toBe("/page/pension");
    expect(screen.getByText(/This page is not in the app yet/)).toBeOnTheScreen();
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

  it("Sign out in More goes through S2b's confirm dialog: Cancel keeps the session, Sign out ends it", async () => {
    const alert = jest
      .spyOn(require("react-native").Alert, "alert")
      .mockImplementation(() => {}) as jest.SpyInstance;
    const { app } = await openApp("/more");
    const user = userEvent.setup();
    const ask = async () => {
      await user.press(screen.getByRole("button", { name: "Sign out" }));
      const call = alert.mock.calls.at(-1) ?? [];
      return call as [string, string, { text: string; onPress?: () => void }[]];
    };
    const [title, message, buttons] = await ask();
    // The dialog's own words for this platform (Jest runs as iOS), not a direct sign-out.
    expect([title, message]).toEqual(["Sign out of Flump?", signOutConfirmMessage("ios")]);
    expect(app.session.signOut).not.toHaveBeenCalled();
    await act(async () => buttons.find((b) => b.text === "Cancel")?.onPress?.());
    expect(app.session.signOut).not.toHaveBeenCalled();
    const [, , again] = await ask();
    await act(async () => again.find((b) => b.text === "Sign out")?.onPress?.());
    expect(app.session.signOut).toHaveBeenCalledTimes(1);
  });

  it("the check-in row on Home opens the check-in", async () => {
    const { router } = await openApp("/");
    const action = await screen.findByTestId("check-in-row-action", {}, { timeout: 3000 });
    await userEvent.setup().press(action);
    expect(router.getPathname()).toBe("/check-in");
  });
});
