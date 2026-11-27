import { render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { DebtHelpLink } from "./DebtHelpLink";
import { debtHelpLinkStates } from "./DebtHelpLink.states";

describe("DebtHelpLink", () => {
  afterEach(() => jest.restoreAllMocks());

  it("says where free debt help is and opens MoneyHelper's locator", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await render(
      <ThemeProvider scheme="light">
        <DebtHelpLink />
      </ThemeProvider>,
    );
    expect(screen.getByText("Free, impartial debt help is available from")).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole("link", { name: "MoneyHelper" }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      "https://www.moneyhelper.org.uk/en/money-troubles/dealing-with-debt/debt-advice-locator",
    );
  });

  it.each(Object.entries(debtHelpLinkStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<DebtHelpLink {...props} />);
  });
});
