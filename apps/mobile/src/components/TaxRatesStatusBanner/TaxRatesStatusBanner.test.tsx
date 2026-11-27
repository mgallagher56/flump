import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { TaxRatesStatusBanner, type TaxRatesStatusBannerProps } from "./TaxRatesStatusBanner";
import { taxRatesStatusBannerStates } from "./TaxRatesStatusBanner.states";

async function notice(props: TaxRatesStatusBannerProps, scheme: "light" | "dark" = "light") {
  await render(
    <ThemeProvider scheme={scheme}>
      <TaxRatesStatusBanner {...props} />
    </ThemeProvider>,
  );
}

const fill = () =>
  (StyleSheet.flatten(screen.getByTestId("tax-rates-status-banner").props.style) as ViewStyle)
    .backgroundColor;

describe("TaxRatesStatusBanner", () => {
  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("provisional rates: web's sentence in the info colours (%s)", async (scheme, t) => {
    await notice(taxRatesStatusBannerStates.provisional, scheme);
    const words =
      "2027/28 rates are provisional: announced but not yet confirmed. Figures may change.";
    expect(screen.getByText(words)).toBeOnTheScreen();
    expect(fill()).toBe(t.colors["status.info.bg"]);
    expect((StyleSheet.flatten(screen.getByText(words).props.style) as TextStyle).color).toBe(
      t.colors["status.info.text"],
    );
  });

  it("after the latest year in Flump: the year in use, in the warning colours", async () => {
    await notice(taxRatesStatusBannerStates.fallback);
    expect(
      screen.getByText(
        "Using 2027/28 rates. The 2028/29 rates are not in Flump yet, so figures may be out of date.",
      ),
    ).toBeOnTheScreen();
    expect(fill()).toBe(light.colors["status.warning.bg"]);
  });

  it("another year's rates without the fallback flag still says so", async () => {
    await notice(taxRatesStatusBannerStates.otherYear);
    expect(
      screen.getByText("Using 2026/27 rates, not 2027/28 rates, so figures may be out of date."),
    ).toBeOnTheScreen();
  });

  it("nothing when the rates are the calendar year's confirmed ones, or there is no context", async () => {
    await notice(taxRatesStatusBannerStates.confirmed);
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
    await notice({ rates: null });
    expect(screen.queryByTestId("tax-rates-status-banner")).toBeNull();
  });

  it("is read out as one item", async () => {
    await notice(taxRatesStatusBannerStates.provisional);
    expect(screen.getByTestId("tax-rates-status-banner").props.accessible).toBe(true);
  });

  it.each(Object.entries(taxRatesStatusBannerStates).filter(([name]) => name !== "confirmed"))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<TaxRatesStatusBanner {...props} />);
    },
  );
});
