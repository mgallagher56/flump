import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { RatesNotice, type RatesNoticeProps } from "./RatesNotice";
import { ratesNoticeStates } from "./RatesNotice.states";

async function notice(props: RatesNoticeProps, scheme: "light" | "dark" = "light") {
  await render(
    <ThemeProvider scheme={scheme}>
      <RatesNotice {...props} />
    </ThemeProvider>,
  );
}

const fill = () =>
  (StyleSheet.flatten(screen.getByTestId("rates-notice").props.style) as ViewStyle).backgroundColor;

describe("RatesNotice", () => {
  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("provisional rates: web's sentence in the info colours (%s)", async (scheme, t) => {
    await notice(ratesNoticeStates.provisional, scheme);
    const words =
      "2027/28 rates are provisional: announced but not yet confirmed. Figures may change.";
    expect(screen.getByText(words)).toBeOnTheScreen();
    expect(fill()).toBe(t.colors["status.info.bg"]);
    expect((StyleSheet.flatten(screen.getByText(words).props.style) as TextStyle).color).toBe(
      t.colors["status.info.text"],
    );
  });

  it("after the latest year in Flump: the year in use, in the warning colours", async () => {
    await notice(ratesNoticeStates.fallback);
    expect(
      screen.getByText(
        "Using 2027/28 rates. The 2028/29 rates are not in Flump yet, so figures may be out of date.",
      ),
    ).toBeOnTheScreen();
    expect(fill()).toBe(light.colors["status.warning.bg"]);
  });

  it("another year's rates without the fallback flag still says so", async () => {
    await notice(ratesNoticeStates.otherYear);
    expect(
      screen.getByText("Using 2026/27 rates, not 2027/28 rates, so figures may be out of date."),
    ).toBeOnTheScreen();
  });

  it("nothing when the rates are the calendar year's confirmed ones, or there is no context", async () => {
    await notice(ratesNoticeStates.confirmed);
    expect(screen.queryByTestId("rates-notice")).toBeNull();
    await notice({ rates: null });
    expect(screen.queryByTestId("rates-notice")).toBeNull();
  });

  it("is read out as one item", async () => {
    await notice(ratesNoticeStates.provisional);
    expect(screen.getByTestId("rates-notice").props.accessible).toBe(true);
  });

  it.each(Object.entries(ratesNoticeStates).filter(([name]) => name !== "confirmed"))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<RatesNotice {...props} />);
    },
  );
});
