/**
 * Tests only: a session whose state a test sets, with every controller method a mock, wrapped in
 * the providers a signed-in screen reads (E12 S9). Nothing in the app imports it.
 */
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type { AppLock } from "../auth/deviceLock";
import { type AppSession, SessionProvider } from "../auth/SessionProvider";
import type { ReauthResult, Session } from "../auth/session";
import type { SessionState } from "../auth/sessionMachine";
import type { DeleteOutcome } from "../data/deleteAccount";
import type { ExportOutcome } from "../data/exportData";
import { ThemeProvider } from "../theme/ThemeProvider";

function fakeSession(initial: SessionState = { status: "signedIn" }) {
  let state = initial;
  const listeners = new Set<(s: SessionState) => void>();
  const set = (next: SessionState) => {
    state = next;
    for (const listener of listeners) listener(state);
  };
  const session = {
    getState: () => state,
    subscribe: (listener: (s: SessionState) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    restore: jest.fn(async () => {}),
    retry: jest.fn(async () => {}),
    signIn: jest.fn(async () => {}),
    signOut: jest.fn(async () => {}),
    getAccessToken: () => null,
    refresh: jest.fn(),
    reauthenticate: jest.fn(async (): Promise<ReauthResult> => "confirmed"),
    deletionPending: jest.fn(() => set({ status: "deletionPending" })),
    accountDeleted: jest.fn(async () => set({ status: "accountDeleted" })),
    acknowledgeDeletion: jest.fn(() => set({ status: "signedOut", notice: null })),
  };
  return { session: session as unknown as Session & typeof session, set };
}

function fakeAccountData() {
  return {
    exportData: jest.fn(async (): Promise<ExportOutcome> => "shared"),
    deleteAccount: jest.fn(async (): Promise<DeleteOutcome> => "deleted"),
  };
}

export type FakeApp = ReturnType<typeof fakeSession> & {
  accountData: ReturnType<typeof fakeAccountData>;
  app: AppSession;
};

export function fakeApp(
  initial?: SessionState,
  over: { appLock?: AppLock; accountData?: boolean } = {},
): FakeApp {
  const fake = fakeSession(initial);
  const accountData = fakeAccountData();
  return {
    ...fake,
    accountData,
    app: {
      session: fake.session,
      marketingOrigin: "https://site.test.invalid",
      webAppOrigin: "https://app.test.invalid",
      accountData: over.accountData === false ? undefined : accountData,
      appLock: over.appLock,
    },
  };
}

/** Renders a screen inside the theme and the session. */
export async function renderWithSession(ui: ReactElement, app: FakeApp) {
  return render(
    <ThemeProvider scheme="light">
      <SessionProvider app={app.app}>{ui}</SessionProvider>
    </ThemeProvider>,
  );
}
