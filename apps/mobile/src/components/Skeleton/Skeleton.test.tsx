import { dark, light, textStyles } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { Dimensions, StyleSheet, type ViewStyle } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Skeleton } from "./Skeleton";
import { skeletonStates } from "./Skeleton.states";

const linesOf = () =>
  screen
    .getAllByTestId("skeleton-line", { includeHiddenElements: true })
    .map((n) => StyleSheet.flatten(n.props.style) as ViewStyle);

describe("Skeleton", () => {
  it("is one busy element named by its label", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Skeleton label="Loading your accounts" testID="s" />
      </ThemeProvider>,
    );
    const wrapper = screen.getByLabelText("Loading your accounts");
    expect(wrapper.props.accessible).toBe(true);
    expect(wrapper.props.accessibilityState).toEqual({ busy: true });
  });

  it("draws three blocks by default, each hidden from screen readers", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Skeleton label="Loading" />
      </ThemeProvider>,
    );
    expect(linesOf()).toHaveLength(3);
    expect(screen.queryAllByTestId("skeleton-line")).toHaveLength(0);
  });

  it("draws the number of blocks asked for", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Skeleton label="Loading" lines={5} />
      </ThemeProvider>,
    );
    expect(linesOf()).toHaveLength(5);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("blocks sit on the sunken surface in %s", async (scheme, tokens) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <Skeleton label="Loading" lines={2} />
      </ThemeProvider>,
    );
    for (const line of linesOf())
      expect(line.backgroundColor).toBe(tokens.colors["surface.sunken"]);
  });

  it("each block is one body line high at the phone's text size", async () => {
    await render(
      <ThemeProvider scheme="light">
        <Skeleton label="Loading" lines={2} />
      </ThemeProvider>,
    );
    const { fontScale } = Dimensions.get("window");
    for (const line of linesOf()) {
      expect(line.height).toBe(textStyles["body.md"].lineHeight * fontScale);
    }
  });

  // No text to measure, so the 200% check is that each block grows with the text size it stands in for.
  it.each(Object.entries(skeletonStates))(
    "%s blocks double at 200%% text",
    async (_name, props) => {
      await render(
        <ThemeProvider scheme="light" textScale={2}>
          <Skeleton {...props} />
        </ThemeProvider>,
      );
      for (const line of linesOf()) expect(line.height).toBe(textStyles["body.md"].lineHeight * 2);
    },
  );
});
