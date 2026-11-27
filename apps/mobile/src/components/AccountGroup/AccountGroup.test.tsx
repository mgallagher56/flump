import { render, screen } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { AccountGroup } from "./AccountGroup";
import { accountGroupStates } from "./AccountGroup.states";

describe("AccountGroup", () => {
  it("a heading, its line, the rows and the total read as one item", async () => {
    await render(
      <ThemeProvider scheme="light">
        <AccountGroup {...accountGroupStates.withTotal} testID="g" />
      </ThemeProvider>,
    );
    expect(screen.getByRole("header", { name: "What you own" })).toBeOnTheScreen();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByTestId("g-total").props.accessibilityLabel).toBe("Total you own, £11,000");
    expect(screen.getByText("£11,000")).toBeOnTheScreen();
  });

  it("no total when none is given; the footnote when it is", async () => {
    await render(
      <ThemeProvider scheme="light">
        <AccountGroup {...accountGroupStates.withFootnote} testID="g" />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId("g-total")).toBeNull();
    expect(screen.getByText(/Repayments come out of your pay/)).toBeOnTheScreen();
  });

  it.each(Object.entries(accountGroupStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<AccountGroup {...props} />);
  });
});
