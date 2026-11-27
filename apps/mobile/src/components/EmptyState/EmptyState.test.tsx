import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { EmptyState } from "./EmptyState";
import { emptyStateStates } from "./EmptyState.states";

describe("EmptyState", () => {
  it("names what is not here as a heading, says what fills it, and offers each way on", async () => {
    const start = jest.fn();
    const website = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <EmptyState
          {...emptyStateStates.twoActions}
          actions={[
            { label: "Start monthly check-in", onPress: start },
            { label: "Add earlier months on the website", onPress: website, variant: "link" },
          ]}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "No monthly balances yet" })).toBeOnTheScreen();
    expect(screen.getByText(/Record this month's balances/)).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Start monthly check-in" }));
    await user.press(screen.getByRole("link", { name: "Add earlier months on the website" }));
    expect([start.mock.calls.length, website.mock.calls.length]).toEqual([1, 1]);
  });

  it("shows no button when it has no action", async () => {
    await render(
      <ThemeProvider scheme="light">
        <EmptyState {...emptyStateStates.noAction} />
      </ThemeProvider>,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it.each(Object.entries(emptyStateStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<EmptyState {...props} />);
  });
});
