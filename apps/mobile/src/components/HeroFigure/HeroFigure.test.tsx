import { dark, light, textStyles } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { Dimensions, StyleSheet, type TextStyle } from "react-native";
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
    expect(screen.getByLabelText("Net worth, Not set").props.accessible).toBe(true);
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

  it("speaks a minus as minus", async () => {
    await render(
      <ThemeProvider scheme="light">
        <HeroFigure label="Net worth" value={-6400} testID="h" />
      </ThemeProvider>,
    );
    expect(screen.getByText("-£6,400")).toBeOnTheScreen();
    expect(screen.getByLabelText("Net worth, minus £6,400")).toBeOnTheScreen();
  });

  it.each([
    ["up", "arrow-up"],
    ["down", "arrow-down"],
    ["flat", "minus"],
  ] as const)(
    "a change %s: its arrow and words in the figure's colour, spoken in the summary",
    async (direction, _icon) => {
      await render(
        <ThemeProvider scheme="dark">
          <HeroFigure
            label="Net worth"
            value={52100}
            change={{
              direction,
              text: "£320 since October",
              spoken: `${direction} £320 since October`,
            }}
            testID="h"
          />
        </ThemeProvider>,
      );
      expect(textOf("£320 since October").color).toBe(dark.colors["text.primary"]);
      expect(textOf("£320 since October").fontVariant).toEqual(["tabular-nums"]);
      expect(
        screen.getByLabelText(`Net worth, £52,100, ${direction} £320 since October`).props
          .accessible,
      ).toBe(true);
      expect(screen.getByTestId("h-change")).toBeOnTheScreen();
    },
  );

  it("draws what it is given under the figure, outside the spoken group", async () => {
    const { Text } = require("../Text");
    await render(
      <ThemeProvider scheme="light">
        <HeroFigure label="Net worth" value={52100} testID="h">
          <Text testID="slot">Bars</Text>
        </HeroFigure>
      </ThemeProvider>,
    );
    const group = screen.getByLabelText("Net worth, £52,100");
    expect(screen.getByTestId("slot")).toBeOnTheScreen();
    expect(group).not.toContainElement(screen.getByTestId("slot"));
  });

  it("no figure, with a prompt: Not set, the prompt and the action as its own link", async () => {
    const onPress = jest.fn();
    await render(
      <ThemeProvider scheme="light">
        <HeroFigure
          label="Net worth"
          value={null}
          emptyPrompt="Add an account to see your net worth."
          emptyAction={{ label: "Add an account on the website", onPress }}
        />
      </ThemeProvider>,
    );
    expect(screen.getByText("Not set")).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
    expect(screen.getByText("Add an account to see your net worth.")).toBeOnTheScreen();
    await userEvent
      .setup()
      .press(screen.getByRole("link", { name: "Add an account on the website" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each([
    // The app: the phone's own text size (Jest's window reports its fontScale).
    [1, Dimensions.get("window").fontScale],
    // A gallery preview draws its own scale.
    [2, 2],
  ])(
    "loading at preview scale %s: one block per line, each one line of the hero's own text high",
    async (textScale, scale) => {
      await render(
        <ThemeProvider scheme="light" textScale={textScale}>
          <HeroFigure
            label="Net worth"
            value={null}
            loading
            loadingLabel="Loading your net worth"
            testID="h"
          />
        </ThemeProvider>,
      );
      const height = (part: string) =>
        StyleSheet.flatten(
          screen.getByTestId(`h-skeleton-${part}`, { includeHiddenElements: true }).props.style,
        ).height;
      expect(height("label")).toBe(textStyles["label.md"].lineHeight * scale);
      expect(height("figure")).toBe(textStyles["heading.lg"].lineHeight * scale);
      expect(height("line")).toBe(textStyles["body.sm"].lineHeight * scale);
      expect(screen.getByLabelText("Loading your net worth").props.accessibilityState).toEqual({
        busy: true,
      });
      expect(screen.queryByText("Not set")).toBeNull();
    },
  );

  it("loading keeps one block the height of what will sit under the figure, and none without it", async () => {
    const view = await render(
      <ThemeProvider scheme="light">
        <HeroFigure label="Net worth" value={null} loading loadingSlotHeight={56} testID="h" />
      </ThemeProvider>,
    );
    const slot = screen.getByTestId("h-skeleton-slot", { includeHiddenElements: true });
    expect(StyleSheet.flatten(slot.props.style).height).toBe(56);
    await view.rerender(
      <ThemeProvider scheme="light">
        <HeroFigure label="Net worth" value={null} loading testID="h" />
      </ThemeProvider>,
    );
    expect(screen.queryByTestId("h-skeleton-slot", { includeHiddenElements: true })).toBeNull();
  });

  it.each(Object.entries(heroFigureStates).filter(([name]) => name !== "loading"))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<HeroFigure {...props} />);
    },
  );
});
