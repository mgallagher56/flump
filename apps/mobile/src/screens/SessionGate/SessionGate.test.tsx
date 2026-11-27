import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { Alert, type AlertButton, Platform } from "react-native";
import { SessionProvider } from "../../auth/SessionProvider";
import type { Session } from "../../auth/session";
import type { SessionState } from "../../auth/sessionMachine";
import { Button } from "../../components/Button";
import { Text } from "../../components/Text";
import { ApiProvider } from "../../data/ApiProvider";
import { testQueryClient } from "../../data/fakeApi";
import { useShell } from "../../navigation/shell";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SessionGate } from "./SessionGate";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return {
    Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment>,
    router: { push: jest.fn(), replace: jest.fn() },
    usePathname: () => "/",
  };
});

/** Stands in for the tabs: shows what the shell gives a signed-in screen. */
function ShellProbe() {
  const shell = useShell();
  return (
    <>
      <Text testID="shell">{`${shell.offline ? "offline" : "online"} ${shell.webAppOrigin}`}</Text>
      <Button label="Sign out" onPress={shell.signOut} />
      <Button label="Try again" onPress={shell.retry} />
    </>
  );
}

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

async function gate(app: ReturnType<typeof fakeSession> | null) {
  await render(
    <ThemeProvider scheme="light">
      <SessionProvider
        app={
          app
            ? {
                session: app.session,
                marketingOrigin: "https://s.test.invalid",
                webAppOrigin: "https://app.test.invalid",
              }
            : null
        }
      >
        {/* A cache emptied after the test, so none of its timers outlives it. */}
        <ApiProvider client={null} queryClient={testQueryClient()}>
          <SessionGate>
            <ShellProbe />
          </SessionGate>
        </ApiProvider>
      </SessionProvider>
    </ThemeProvider>,
  );
}

/** The platform alert's answer: presses the named button of the last alert shown. */
function answerAlert(alert: jest.SpyInstance, label: string) {
  const buttons = (alert.mock.calls.at(-1)?.[2] ?? []) as AlertButton[];
  const button = buttons.find((b) => b.text === label);
  if (!button) throw new Error(`No ${label} button in the alert`);
  button.onPress?.();
}

describe("SessionGate", () => {
  // On Jest's clock a press's 130 ms hold costs nothing. Signed in, the gate shows its children
  // (here a probe of the shell; the real tabs are tested through the router in routes.test.tsx).
  let alert: jest.SpyInstance;
  beforeEach(() => {
    jest.useFakeTimers();
    alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("restores on launch and shows Loading until the session settles", async () => {
    const app = fakeSession({ status: "loading" });
    await gate(app);
    expect(app.session.restore).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("progressbar", { name: "Loading" })).toBeOnTheScreen();
    await act(async () => app.set({ status: "signedOut", notice: null }));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeOnTheScreen();
  });

  it.each<[SessionState, string]>([
    [{ status: "signedOut", notice: null }, "Sign in"],
    [{ status: "signingIn" }, "Sign in"],
    [{ status: "signedIn" }, "Sign out"],
    [{ status: "restoredOffline" }, "Try again"],
    [{ status: "sessionEnded" }, "Sign in"],
    [{ status: "notInvited" }, "Sign out"],
    [{ status: "termsRequired" }, "Try again"],
  ])("%j shows a %s button", async (state, button) => {
    await gate(fakeSession(state));
    expect(screen.getByRole("button", { name: button })).toBeOnTheScreen();
  });

  it("wires Sign in, Create account, Sign out and Try again to the session", async () => {
    const app = fakeSession({ status: "signedOut", notice: null });
    await gate(app);
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Sign in" }));
    await user.press(screen.getByRole("button", { name: "Create account" }));
    expect(app.session.signIn.mock.calls).toEqual([["sign-in"], ["sign-up"]]);
    await act(async () => app.set({ status: "restoredOffline" }));
    await user.press(screen.getByRole("button", { name: "Try again" }));
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(app.session.retry).toHaveBeenCalledTimes(1);
    expect(app.session.signOut).not.toHaveBeenCalled();
    await act(async () => answerAlert(alert, "Sign out"));
    expect(app.session.signOut).toHaveBeenCalledTimes(1);
  });

  it("Sign out asks first; Cancel keeps the person signed in", async () => {
    const app = fakeSession({ status: "signedIn" });
    await gate(app);
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0]?.[0]).toBe("Sign out of Flump?");
    await act(async () => answerAlert(alert, "Cancel"));
    expect(app.session.signOut).not.toHaveBeenCalled();
    // Asking again shows the dialog again.
    await userEvent.setup().press(screen.getByRole("button", { name: "Sign out" }));
    expect(alert).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["ios", "This removes your sign-in from this phone. Your data stays in your Flump account."],
    [
      "android",
      "This removes your sign-in from this phone. Your data stays in your Flump account. If you sign in with Google, the Google account in this phone's browser can sign you back in without a password.",
    ],
  ] as const)("on %s the dialog says what sign-out does there", async (os, message) => {
    jest.replaceProperty(Platform, "OS", os);
    await gate(fakeSession({ status: "signedIn" }));
    // fireEvent: a user-event press runs Android's ripple, which needs a native view.
    await act(async () => fireEvent.press(screen.getByRole("button", { name: "Sign out" })));
    expect(alert.mock.calls[0]?.[1]).toBe(message);
  });

  it.each<[SessionState, string | null]>([
    [{ status: "signedIn" }, "online https://app.test.invalid"],
    [{ status: "restoredOffline" }, "offline https://app.test.invalid"],
    [{ status: "loading" }, null],
    [{ status: "signedOut", notice: null }, null],
    [{ status: "sessionEnded" }, null],
    [{ status: "notInvited" }, null],
    [{ status: "termsRequired" }, null],
  ])("%j: the signed-in shell shows only while signed in (%s)", async (state, shell) => {
    await gate(fakeSession(state));
    if (shell === null) expect(screen.queryByTestId("shell")).toBeNull();
    else expect(screen.getByTestId("shell")).toHaveTextContent(shell);
  });

  it("an ended session takes the shell away and shows the session-ended screen", async () => {
    const app = fakeSession({ status: "signedIn" });
    await gate(app);
    expect(screen.getByTestId("shell")).toBeOnTheScreen();
    await act(async () => app.set({ status: "sessionEnded" }));
    expect(screen.queryByTestId("shell")).toBeNull();
    expect(screen.getByRole("header", { name: "You have been signed out" })).toBeOnTheScreen();
  });

  it("terms not agreed: Try again and Sign out reach the session", async () => {
    const app = fakeSession({ status: "termsRequired" });
    await gate(app);
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Try again" }));
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    await act(async () => answerAlert(alert, "Sign out"));
    expect(app.session.retry).toHaveBeenCalledTimes(1);
    expect(app.session.signOut).toHaveBeenCalledTimes(1);
  });

  it("shows a sign-in notice from the session", async () => {
    await gate(fakeSession({ status: "signedOut", notice: "denied" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Sign-in was refused/);
  });

  it("a misconfigured build says so and offers no sign-in", async () => {
    await gate(null);
    expect(screen.getByRole("header", { name: "This build is misconfigured" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  });

  it("a host app without sign-in's native modules says so and offers no sign-in", async () => {
    await render(
      <ThemeProvider scheme="light">
        <SessionProvider app={null} problem={{ kind: "unavailable", missing: ["ExpoCrypto"] }}>
          <SessionGate />
        </SessionProvider>
      </ThemeProvider>,
    );
    expect(
      screen.getByRole("header", { name: "Sign-in is not available in this app" }),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  });
});
