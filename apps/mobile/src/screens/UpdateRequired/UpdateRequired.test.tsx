import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { UpdateRequired } from "./UpdateRequired";

describe("UpdateRequired", () => {
  it("says an update is needed and checks again on request", async () => {
    const onCheckAgain = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <UpdateRequired onCheckAgain={onCheckAgain} />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header")).toHaveTextContent("Update Flump to carry on");
    expect(screen.getByText(/no longer supported/)).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("button", { name: "Check again" }));
    expect(onCheckAgain).toHaveBeenCalledTimes(1);
  });

  it("holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<UpdateRequired onCheckAgain={() => {}} />);
  });
});
