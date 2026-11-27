import { fireEvent, render, screen } from "@testing-library/react-native";
import { EXPORT, WEB_EXPORT } from "../../copy/accountData";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ExportDataSection, type ExportDataSectionProps } from "./ExportDataSection";
import { exportDataSectionStates } from "./ExportDataSection.states";

async function show(props: Partial<ExportDataSectionProps> = {}) {
  const onDownload = jest.fn();
  await render(
    <ThemeProvider scheme="light">
      <ExportDataSection state="idle" onDownload={onDownload} {...props} />
    </ThemeProvider>,
  );
  return onDownload;
}

describe("ExportDataSection", () => {
  it("says what the file is and, before anything is shared, that it leaves Flump's protection", async () => {
    const onDownload = await show();
    expect(screen.getByRole("header")).toHaveTextContent(WEB_EXPORT.heading);
    expect(screen.getByText(WEB_EXPORT.description)).toBeOnTheScreen();
    expect(screen.getByText(EXPORT.beforeSharing)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: WEB_EXPORT.button }));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("while preparing: the button says so and ignores presses", async () => {
    const onDownload = await show({ state: "pending" });
    const button = screen.getByRole("button", { name: WEB_EXPORT.pending });
    expect(button.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
    await fireEvent.press(button);
    expect(onDownload).not.toHaveBeenCalled();
  });

  it("the button keeps a spoken label before, during and after a download, and busy clears", async () => {
    // Device check: after a download the label read was just "busy" (the name came only from the
    // text inside, which TalkBack lost across the busy change). The label is now set on the control.
    const view = await render(
      <ThemeProvider scheme="light">
        <ExportDataSection state="idle" onDownload={() => {}} />
      </ThemeProvider>,
    );
    const steps = [
      ["idle", WEB_EXPORT.button, false],
      ["pending", WEB_EXPORT.pending, true],
      ["shared", WEB_EXPORT.button, false],
    ] as const;
    for (const [state, label, busy] of steps) {
      await view.rerender(
        <ThemeProvider scheme="light">
          <ExportDataSection state={state} onDownload={() => {}} />
        </ThemeProvider>,
      );
      const button = screen.getByTestId("export-data-button");
      expect(button.props.accessibilityLabel).toBe(label);
      expect(button.props.accessibilityState).toMatchObject({ busy, disabled: busy });
    }
  });

  it.each([
    ["shared", EXPORT.shared],
    ["rateLimited", WEB_EXPORT.rateLimited],
    ["failed", WEB_EXPORT.failed],
  ] as const)("%s says so in an alert", async (state, message) => {
    await show({ state });
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: WEB_EXPORT.button })).toBeEnabled();
  });

  it("disabled (offline): the button cannot be pressed", async () => {
    const onDownload = await show({ disabled: true });
    const button = screen.getByRole("button", { name: WEB_EXPORT.button });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onDownload).not.toHaveBeenCalled();
  });

  it.each(Object.entries(exportDataSectionStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<ExportDataSection {...props} />);
  });
});
