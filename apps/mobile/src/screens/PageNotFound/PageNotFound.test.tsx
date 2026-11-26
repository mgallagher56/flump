import { render, screen, userEvent } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { PageNotFound } from "./PageNotFound";

describe("PageNotFound", () => {
  it("says the page was not found and offers one way back, to More", async () => {
    jest.useRealTimers();
    const onGoToMore = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <PageNotFound onGoToMore={onGoToMore} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "We could not find that page" })).toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.setup().press(screen.getByRole("button", { name: "Go to More" }));
    expect(onGoToMore).toHaveBeenCalledTimes(1);
  });
});
