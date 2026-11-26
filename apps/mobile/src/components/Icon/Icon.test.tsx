import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { ICON_SHAPES } from "../../navigation/iconShapes";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Icon } from "./Icon";
import { iconStates } from "./Icon.states";

const HIDDEN = { includeHiddenElements: true } as const;

describe("Icon", () => {
  it("draws every shape of the named icon on lucide's 24 grid with a 2 point round stroke", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Icon testID="i" name="calculator" />
      </ThemeProvider>,
    );
    const svg = screen.getByTestId("i", HIDDEN);
    const json = JSON.stringify(screen.toJSON());
    // calculator is one rect, two lines and seven dots.
    expect(ICON_SHAPES.calculator).toHaveLength(10);
    for (const shape of ICON_SHAPES.calculator) {
      if (shape[0] === "path") expect(json).toContain(shape[1].d);
    }
    expect(svg.props.accessibilityElementsHidden).toBe(true);
    expect(svg.props.importantForAccessibility).toBe("no-hide-descendants");
  });

  it.each([
    ["secondary", "text.secondary"],
    ["primary", "text.primary"],
    ["accent", "primary"],
  ] as const)("colour %s strokes in %s, in each theme", async (color, token) => {
    for (const [scheme, set] of [
      ["light", light],
      ["dark", dark],
    ] as const) {
      await render(
        <ThemeProvider scheme={scheme}>
          <Icon testID="i" name="house" color={color} />
        </ThemeProvider>,
      );
      expect(JSON.stringify(screen.toJSON())).toContain(JSON.stringify(set.colors[token]));
    }
  });

  it.each([
    ["sm", 16],
    ["md", 24],
  ] as const)("size %s is %d points square", async (size, side) => {
    await render(
      <ThemeProvider scheme="light">
        <Icon testID="i" name="house" size={size} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("i", HIDDEN).props.style).toEqual({ width: side, height: side });
  });

  it.each(Object.entries(iconStates))("%s renders", async (_name, props) => {
    await render(
      <ThemeProvider scheme="dark">
        <Icon testID="i" {...props} />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("i", HIDDEN).props.accessibilityElementsHidden).toBe(true);
  });
});
