import { dark, light, textStyles } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { HeroFigure } from "./HeroFigure";
import { heroFigureStates } from "./HeroFigure.states";

const textOf = (words: string) =>
  StyleSheet.flatten(screen.getByText(words).props.style) as TextStyle;

describe("HeroFigure", () => {
  it("shows the label, the figure in whole pounds and the caption", async () => {
    await render(
      <ThemeProvider scheme="light">
        <HeroFigure label="Net worth" value={48250.4} caption="Recorded in October" />
      </ThemeProvider>,
    );
    expect(screen.getByText("Net worth")).toBeOnTheScreen();
    expect(screen.getByText("£48,250")).toBeOnTheScreen();
    expect(screen.getByText("Recorded in October")).toBeOnTheScreen();
    expect(textOf("£48,250").fontSize).toBe(textStyles["heading.lg"].fontSize);
    expect(textOf("£48,250").fontVariant).toEqual(["tabular-nums"]);
  });

  it("is read out as one item", async () => {
    await render(
      <ThemeProvider scheme="light">
        <HeroFigure label="Net worth" value={48250} caption="Recorded in October" />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText("Net worth, £48,250, Recorded in October").props.accessible).toBe(
      true,
    );
  });

  it("shows Not set for an unknown figure and no caption when there is none", async () => {
    await render(
      <ThemeProvider scheme="light">
        <HeroFigure label="Net worth" value={null} caption={null} testID="h" />
      </ThemeProvider>,
    );
    expect(screen.getByText("Not set")).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByTestId("h").props.accessibilityLabel).toBe("Net worth, Not set");
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "label and caption are secondary, the figure primary, in %s",
    async (scheme, tokens) => {
      await render(
        <ThemeProvider scheme={scheme}>
          <HeroFigure label="Net worth" value={-6400} caption="Recorded in October" />
        </ThemeProvider>,
      );
      expect(textOf("Net worth").color).toBe(tokens.colors["text.secondary"]);
      expect(textOf("Recorded in October").color).toBe(tokens.colors["text.secondary"]);
      expect(textOf("-£6,400").color).toBe(tokens.colors["text.primary"]);
    },
  );

  it.each(Object.entries(heroFigureStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<HeroFigure {...props} />);
  });
});
