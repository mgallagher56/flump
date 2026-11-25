import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { Card } from "./Card";
import { cardStates } from "./Card.states";

const boxOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as ViewStyle;

describe("Card", () => {
  it("defaults to the card surface, card radius, border, resting shadow and card padding", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Card testID="c">
          <Text>Body</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(boxOf("c")).toMatchObject({
      backgroundColor: light.colors["surface.card"],
      borderColor: light.colors.border,
      borderWidth: 1,
      // radii.card and spacing density.cardPad in the tokens.
      borderRadius: 16,
      padding: 20,
      boxShadow: light.shadows.card,
    });
  });

  it.each([
    ["subtle", "surface.subtle"],
    ["sunken", "surface.sunken"],
  ] as const)("surface %s uses %s", async (surface, token) => {
    await render(
      <ThemeProvider scheme="dark">
        <Card testID="c" surface={surface}>
          <Text>Body</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(boxOf("c").backgroundColor).toBe(dark.colors[token]);
  });

  it("elevation none drops the shadow", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Card testID="c" elevation="none">
          <Text>Body</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(boxOf("c").boxShadow).toBeUndefined();
  });

  it.each([
    ["none", 0],
    ["sm", 12],
    ["lg", 20],
  ] as const)("padding %s is %d points", async (padding, points) => {
    await render(
      <ThemeProvider scheme="light">
        <Card testID="c" padding={padding}>
          <Text>Body</Text>
        </Card>
      </ThemeProvider>,
    );
    expect(boxOf("c").padding).toBe(points);
  });

  it.each(Object.entries(cardStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<Card {...props} />);
  });
});
