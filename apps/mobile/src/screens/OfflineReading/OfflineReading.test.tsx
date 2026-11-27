import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "../../components/Text";
import { TextField } from "../../components/TextField";
import { OFFLINE_HEADING } from "../../copy/auth";
import { SAVED_FIGURES } from "../../copy/offline";
import { type Shell, ShellContext } from "../../navigation/shell";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { OfflineReading } from "./OfflineReading";

const NOW = Date.UTC(2026, 10, 27, 12);

async function reading(over: Partial<Shell>) {
  const shell: Shell = {
    offline: false,
    signOut: jest.fn(),
    retry: jest.fn(),
    marketingOrigin: "https://m.test.invalid",
    webAppOrigin: null,
    ...over,
  };
  await render(
    <ThemeProvider scheme="light">
      <ShellContext.Provider value={shell}>
        <OfflineReading now={() => NOW}>
          <Text>£9,876</Text>
        </OfflineReading>
      </ShellContext.Provider>
    </ThemeProvider>,
  );
  return shell;
}

describe("OfflineReading", () => {
  it("online: the screen alone, no notice", async () => {
    await reading({});
    expect(screen.getByText("£9,876")).toBeOnTheScreen();
    expect(screen.queryByTestId("saved-figures-notice")).toBeNull();
  });

  it("offline with saved figures: the screen under the notice of their age", async () => {
    // One hour: 3,600,000 ms.
    await reading({ offline: true, saved: { savedAt: NOW - 3_600_000 } });
    expect(screen.getByText("£9,876")).toBeOnTheScreen();
    expect(screen.getByTestId("saved-figures-notice")).toHaveTextContent(
      SAVED_FIGURES.lastUpdated("1 hour ago"),
      { exact: false },
    );
  });

  it("offline while the cache is read: a spinner, no figure and not the offline screen", async () => {
    await reading({ offline: true, saved: null, restoringSaved: true });
    expect(screen.getByRole("progressbar")).toBeOnTheScreen();
    expect(screen.queryByText("£9,876")).toBeNull();
    expect(screen.queryByText(OFFLINE_HEADING)).toBeNull();
  });

  it("offline with nothing saved: the offline screen, and no figure", async () => {
    await reading({ offline: true, saved: null, restoringSaved: false });
    expect(screen.getByText(OFFLINE_HEADING)).toBeOnTheScreen();
    expect(screen.queryByText("£9,876")).toBeNull();
  });
});

/** A screen holding typed input in its own state, as an open form does. */
function TypedScreen() {
  const [text, setText] = useState("");
  return (
    <>
      <Text>£9,876</Text>
      <TextField accessibilityLabel="Name" value={text} onChangeText={setText} />
    </>
  );
}

describe("OfflineReading when the connection drops mid-session (E12 S7 follow-up)", () => {
  const base: Shell = {
    offline: false,
    signOut: jest.fn(),
    retry: jest.fn(),
    marketingOrigin: "https://m.test.invalid",
    webAppOrigin: null,
  };
  const tree = (shell: Shell) => (
    <ThemeProvider scheme="light">
      <ShellContext.Provider value={shell}>
        <OfflineReading now={() => NOW}>
          <TypedScreen />
        </OfflineReading>
      </ShellContext.Provider>
    </ThemeProvider>
  );

  it("keeps the screen, and what it holds, through the cache read and under the notice", async () => {
    const { rerender } = await render(tree(base));
    await fireEvent.changeText(screen.getByLabelText("Name"), "Water");
    // The cache is still being read: the screen stays, never a spinner in its place.
    await act(async () => rerender(tree({ ...base, offline: true, restoringSaved: true })));
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.getByLabelText("Name").props.value).toBe("Water");
    await act(async () =>
      rerender(tree({ ...base, offline: true, saved: { savedAt: NOW - 3_600_000 } })),
    );
    expect(screen.getByTestId("saved-figures-notice")).toBeOnTheScreen();
    expect(screen.getByLabelText("Name").props.value).toBe("Water");
    // Back online: the notice goes and the screen is still the same one.
    await act(async () => rerender(tree(base)));
    expect(screen.queryByTestId("saved-figures-notice")).toBeNull();
    expect(screen.getByLabelText("Name").props.value).toBe("Water");
  });
});
