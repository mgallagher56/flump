import { dark, light } from "@flump/tokens/native";
import { render, screen, userEvent } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { ScenarioZone, type ScenarioZoneProps } from "./ScenarioZone";
import { scenarioZoneStates } from "./ScenarioZone.states";

const draw = (props: ScenarioZoneProps, scheme: "light" | "dark" = "light") =>
  render(
    <ThemeProvider scheme={scheme}>
      <ScenarioZone {...props} />
    </ThemeProvider>,
  );

describe("ScenarioZone", () => {
  afterEach(() => jest.restoreAllMocks());

  it("is labelled an illustration, starts closed with its summary, and opens to its inputs", async () => {
    await draw(scenarioZoneStates.closed);
    expect(screen.getByRole("header", { name: "Model a change to your budget" })).toBeOnTheScreen();
    expect(screen.getByText("Illustration, not saved")).toBeOnTheScreen();
    expect(
      screen.getByText("Starts from your savings of £8,200 and essentials of £1,615 a month."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("The inputs go here.")).toBeNull();
    const toggle = screen.getByRole("button", {
      name: "Show what-if: redundancy pay, a spending cut",
    });
    expect(toggle.props.accessibilityState).toMatchObject({ expanded: false });
    await userEvent.setup().press(toggle);
    expect(screen.getByText("The inputs go here.")).toBeOnTheScreen();
    expect(screen.getByText("Starting from your saved budget and accounts.")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Hide what-if" }).props.accessibilityState,
    ).toMatchObject({ expanded: true });
    expect(screen.getByTestId("scenario-zone-notice")).toBeOnTheScreen();
  });

  it("offers no Reset while nothing differs", async () => {
    await draw({ ...scenarioZoneStates.open, onReset: jest.fn(), isModified: false });
    expect(screen.getByText("The inputs go here.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Reset to saved figures" })).toBeNull();
  });

  it("offers Reset once an input differs, and Reset calls back", async () => {
    const onReset = jest.fn();
    await draw({ ...scenarioZoneStates.open, onReset, isModified: true });
    await userEvent.setup().press(screen.getByRole("button", { name: "Reset to saved figures" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("announces the outcome with its prefix only once something changed", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    await draw({ ...scenarioZoneStates.open, announcement: "" });
    expect(announce).not.toHaveBeenCalled();
    await screen.rerender(
      <ThemeProvider scheme="light">
        <ScenarioZone {...scenarioZoneStates.open} announcement="Breathing room, about 3 months" />
      </ThemeProvider>,
    );
    expect(announce).toHaveBeenCalledWith("Illustration: Breathing room, about 3 months");
  });

  it("shows the projection notice once, under the outcome", async () => {
    await draw({ ...scenarioZoneStates.open, result: <Text>Outcome</Text> });
    expect(screen.getAllByTestId("scenario-zone-notice")).toHaveLength(1);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("sits on the card surface with the section border in %s", async (scheme, tokens) => {
    await draw(scenarioZoneStates.open, scheme);
    const box = StyleSheet.flatten(screen.getByTestId("scenario-zone").props.style) as ViewStyle;
    expect(box.backgroundColor).toBe(tokens.colors["surface.card"]);
    expect(box.borderColor).toBe(tokens.colors["border.section"]);
  });

  it.each(Object.entries(scenarioZoneStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<ScenarioZone {...props} />);
  });
});
