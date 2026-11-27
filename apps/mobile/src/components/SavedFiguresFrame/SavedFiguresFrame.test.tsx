import { dark, light } from "@flump/tokens/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { SAVED_FIGURES } from "../../copy/offline";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Text } from "../Text";
import { SavedFiguresFrame } from "./SavedFiguresFrame";
import { FRAME_NOW, savedFiguresFrameStates } from "./SavedFiguresFrame.states";

const notice = () => screen.getByTestId("saved-figures-notice");

async function frame(
  props: Partial<Parameters<typeof SavedFiguresFrame>[0]> = {},
  scheme: "light" | "dark" = "light",
) {
  const onTryAgain = jest.fn();
  await render(
    <ThemeProvider scheme={scheme}>
      <SavedFiguresFrame {...savedFiguresFrameStates.hoursAgo} onTryAgain={onTryAgain} {...props}>
        <Text>£1,234</Text>
      </SavedFiguresFrame>
    </ThemeProvider>,
  );
  return onTryAgain;
}

// The first render in a file loads React Native's components; done once here, with its own time,
// so each test's 5 s covers only its own work (as Accounts.test).
beforeAll(async () => {
  await frame();
  screen.unmount();
}, 30_000);

describe("SavedFiguresFrame", () => {
  it.each([
    // 20 seconds ago is under a minute.
    [FRAME_NOW - 20_000, "just now"],
    // 2 x 3,600,000 ms.
    [FRAME_NOW - 7_200_000, "2 hours ago"],
    // 1 day of 86,400,000 ms.
    [FRAME_NOW - 86_400_000, "yesterday"],
    // 3 x 86,400,000 ms.
    [FRAME_NOW - 259_200_000, "3 days ago"],
  ])("says the figures are offline and how old: savedAt %d reads %j", async (savedAt, when) => {
    await frame({ savedAt });
    expect(notice()).toHaveTextContent(
      `${SAVED_FIGURES.lastUpdated(when)}${SAVED_FIGURES.changes}`,
    );
  });

  it("a saved time a little ahead of the phone's clock reads as just now, never in the future", async () => {
    await frame({ savedAt: FRAME_NOW + 120_000 });
    expect(notice()).toHaveTextContent(SAVED_FIGURES.lastUpdated("just now"), { exact: false });
  });

  it("is an alert that screen readers announce, above the figures it explains", async () => {
    await frame();
    expect(notice().props.accessibilityRole).toBe("alert");
    expect(notice().props.accessibilityLiveRegion).toBe("polite");
    expect(screen.getByText("£1,234")).toBeOnTheScreen();
  });

  it("Try again calls back", async () => {
    const onTryAgain = await frame();
    await fireEvent.press(screen.getByRole("button", { name: SAVED_FIGURES.tryAgain }));
    expect(onTryAgain).toHaveBeenCalledTimes(1);
  });

  it("Try again shows busy while checking, and not otherwise", async () => {
    await frame({ checking: true });
    expect(screen.getByRole("button", { name: SAVED_FIGURES.tryAgain })).toBeBusy();
  });

  it("Try again is not busy when not checking", async () => {
    await frame({ checking: false });
    expect(screen.getByRole("button", { name: SAVED_FIGURES.tryAgain })).not.toBeBusy();
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("uses the info surface, not red, in %s", async (scheme, tokens) => {
    await frame({}, scheme);
    const box = StyleSheet.flatten(notice().props.style) as ViewStyle;
    expect(box.backgroundColor).toBe(tokens.colors["status.info.bg"]);
    expect(box.borderColor).toBe(tokens.colors["status.info.border"]);
  });

  it.each(Object.entries(savedFiguresFrameStates))(
    "%s holds at 200%% text",
    async (_name, props) => {
      await expectHoldsAtDoubleText(<SavedFiguresFrame {...props} />);
    },
  );
});
