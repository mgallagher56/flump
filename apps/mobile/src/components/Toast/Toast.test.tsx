import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, StyleSheet, type TextStyle, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { Toast } from "./Toast";
import { toastStates } from "./Toast.states";

const ui = (message: string | null, scheme: "light" | "dark" = "light") => (
  <ThemeProvider scheme={scheme}>
    <Toast message={message} testID="toast" />
  </ThemeProvider>
);

describe("Toast", () => {
  let announce: jest.SpyInstance;
  beforeEach(() => {
    announce = jest
      .spyOn(AccessibilityInfo, "announceForAccessibility")
      .mockImplementation(() => {});
  });
  afterEach(() => announce.mockRestore());

  it("shows nothing and announces nothing for a null message", async () => {
    await render(ui(null));
    expect(screen.queryByTestId("toast")).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it("is a polite live region with the message as its words", async () => {
    await render(ui("Saved your October balances."));
    const toast = screen.getByTestId("toast");
    expect(toast.props.accessibilityRole).toBe("summary");
    // Announced, not a live region: Android would otherwise say it twice.
    expect(toast.props.accessibilityLiveRegion).toBeUndefined();
    expect(screen.getByText("Saved your October balances.")).toBeOnTheScreen();
  });

  it("announces each new message once, and not when it clears", async () => {
    const view = await render(ui("Saved your October balances."));
    expect(announce).toHaveBeenCalledWith("Saved your October balances.");
    await view.rerender(ui("Saved your October balances."));
    expect(announce).toHaveBeenCalledTimes(1);
    await view.rerender(ui(null));
    expect(announce).toHaveBeenCalledTimes(1);
    await view.rerender(ui("Saved your November balances."));
    expect(announce).toHaveBeenLastCalledWith("Saved your November balances.");
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "uses the info surface and ordinary text, never red, in %s",
    async (scheme, tokens) => {
      await render(ui("Saved.", scheme));
      const box = StyleSheet.flatten(screen.getByTestId("toast").props.style) as ViewStyle;
      const text = StyleSheet.flatten(screen.getByText("Saved.").props.style) as TextStyle;
      expect(box.backgroundColor).toBe(tokens.colors["status.info.bg"]);
      expect(box.borderColor).toBe(tokens.colors["status.info.border"]);
      expect(text.color).toBe(tokens.colors["text.primary"]);
    },
  );

  it("saved holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<Toast {...toastStates.saved} />);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)(
    "overlay placement adds the overlay shadow in %s while inline stays flat",
    async (scheme, tokens) => {
      await render(
        <ThemeProvider scheme={scheme}>
          <Toast message="Saved" testID="inline-toast" />
          <Toast message="Saved" placement="overlay" testID="overlay-toast" />
        </ThemeProvider>,
      );
      const inlineBox = StyleSheet.flatten(
        screen.getByTestId("inline-toast").props.style,
      ) as ViewStyle;
      const overlayBox = StyleSheet.flatten(
        screen.getByTestId("overlay-toast").props.style,
      ) as ViewStyle;
      expect(inlineBox.boxShadow).toBeUndefined();
      expect(overlayBox.boxShadow).toBe(tokens.shadows.overlay);
    },
  );

  it("overlay holds at 200% text", async () => {
    await expectHoldsAtDoubleText(<Toast {...toastStates.overlay} />);
  });
});
