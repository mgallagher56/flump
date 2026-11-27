import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { More } from "./More";

jest.mock("expo-router", () => {
  const { Fragment } = require("react");
  return { Link: ({ children }: { children: unknown }) => <Fragment>{children}</Fragment> };
});

async function more(enabledPages?: readonly string[] | null) {
  const onOpenPage = jest.fn();
  const onSignOut = jest.fn();
  await render(
    <ThemeProvider scheme="light">
      <More onOpenPage={onOpenPage} onSignOut={onSignOut} enabledPages={enabledPages} />
    </ThemeProvider>,
  );
  return { onOpenPage, onSignOut };
}

describe("More", () => {
  beforeEach(() => jest.useRealTimers());

  it("lists web's drawer groups and pages in order, then the footer rows, then Sign out", async () => {
    await more();
    expect(screen.getAllByRole("header").map((h) => h.props.children)).toEqual([
      "Savings and pension",
      "Debt and borrowing",
      // Every group has a heading, the last one too (device check).
      "Settings and tools",
    ]);
    expect(screen.getAllByRole("link").map((row) => row.props.testID)).toEqual([
      "more-row-savings",
      "more-row-pension",
      "more-row-retirement",
      "more-row-debt",
      "more-row-mortgage",
      "more-row-settings",
      "more-row-connectAi",
      "more-row-tools",
      // The development links at the foot (S5: moved from Home; Jest runs as a development build).
      "dev-link-engine-check",
      "dev-link-gallery",
      "dev-link-sign-in-check",
    ]);
    expect(screen.getByRole("link", { name: "Cards and loans" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
    // Opt-in per person: off with nothing stored (pageSwitches.ts).
    expect(screen.queryByText("Self Assessment")).toBeNull();
  });

  it("with Self Assessment switched on, lists it first under Pay, as web's drawer", async () => {
    const { onOpenPage } = await more(["savings", "pension", "debt", "mortgage", "tax"]);
    expect(screen.getAllByRole("header").map((h) => h.props.children)).toEqual([
      "Pay",
      "Savings and pension",
      "Debt and borrowing",
      "Settings and tools",
    ]);
    await userEvent.setup().press(screen.getByRole("link", { name: "Self Assessment" }));
    expect(onOpenPage.mock.calls).toEqual([["tax"]]);
  });

  it("drops switched-off pages, and a group left with one page becomes its row", async () => {
    const { onOpenPage } = await more(["savings", "debt"]);
    expect(screen.getAllByRole("header").map((h) => h.props.children)).toEqual([
      "Settings and tools",
    ]);
    expect(screen.queryByRole("link", { name: "Pension" })).toBeNull();
    // Debt and borrowing collapses under the group's name and opens Cards and loans.
    await userEvent.setup().press(screen.getByRole("link", { name: "Debt and borrowing" }));
    expect(onOpenPage.mock.calls).toEqual([["debt"]]);
  });

  it("opens a page by its key, and Sign out asks through onSignOut", async () => {
    const { onOpenPage, onSignOut } = await more();
    const user = userEvent.setup();
    await user.press(screen.getByRole("link", { name: "Pension" }));
    await user.press(screen.getByRole("link", { name: "Connect AI" }));
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(onOpenPage.mock.calls).toEqual([["pension"], ["connectAi"]]);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
