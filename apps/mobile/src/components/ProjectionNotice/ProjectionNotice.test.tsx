import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ProjectionNotice } from "./ProjectionNotice";
import { projectionNoticeStates } from "./ProjectionNotice.states";

describe("ProjectionNotice", () => {
  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("shows the fixed words on the neutral surface in %s", async (scheme, tokens) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <ProjectionNotice />
      </ThemeProvider>,
    );
    expect(
      screen.getByText(
        "Guidance, not advice. Flump works from the figures you enter and shows estimates, which can differ from what happens in practice. It is not financial, tax, investment or debt advice.",
      ),
    ).toBeOnTheScreen();
    const box = StyleSheet.flatten(
      screen.getByTestId("projection-notice").props.style,
    ) as ViewStyle;
    expect(box.backgroundColor).toBe(tokens.colors["status.neutral.bg"]);
  });

  it.each(Object.entries(projectionNoticeStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<ProjectionNotice {...props} />);
  });
});
