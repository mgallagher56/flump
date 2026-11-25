import { act, render, screen, userEvent } from "@testing-library/react-native";
import { SessionProvider } from "../../auth/SessionProvider";
import type { Session } from "../../auth/session";
import type { SessionState } from "../../auth/sessionMachine";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { SessionGate } from "./SessionGate";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

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
        app={app ? { session: app.session, marketingOrigin: "https://s.test.invalid" } : null}
      >
        <SessionGate />
      </SessionProvider>
    </ThemeProvider>,
  );
}

describe("SessionGate", () => {
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
});
