import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { More } from "./More";

async function more() {
  const onOpenPage = jest.fn();
  const onSignOut = jest.fn();
  await render(
    <ThemeProvider scheme="light">
      <More onOpenPage={onOpenPage} onSignOut={onSignOut} />
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
    ]);
    expect(screen.getByRole("link", { name: "Cards and loans" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
    // Opt-in per person; left out until S9's shared filter (navItems.ts).
    expect(screen.queryByText("Self Assessment")).toBeNull();
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
