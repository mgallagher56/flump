import { render, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Alert, type AlertButton, type AlertOptions } from "react-native";
import { ThemeProvider, useTheme } from "../../theme/ThemeProvider";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";
import { confirmDialogStates } from "./ConfirmDialog.states";
import { createStyles } from "./ConfirmDialog.styles";

type AlertCall = [string, string, AlertButton[], AlertOptions];

function setup(overrides: Partial<ConfirmDialogProps> = {}) {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const props = {
    ...confirmDialogStates.destructive,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  const lastCall = () => alert.mock.calls.at(-1) as unknown as AlertCall;
  const press = (text: string) =>
    lastCall()[2]
      .find((b) => b.text === text)
      ?.onPress?.();
  return { alert, props, lastCall, press };
}

afterEach(() => jest.restoreAllMocks());

describe("ConfirmDialog", () => {
  it("draws nothing of its own: the platform draws the dialog, so it has no styles", async () => {
    const { props } = setup({ visible: false });
    const view = await render(<ConfirmDialog {...props} />);
    expect(view.toJSON()).toBeNull();
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <ThemeProvider scheme="light">{children}</ThemeProvider>
      ),
    });
    expect(Object.keys(createStyles(result.current))).toEqual([]);
  });

  it("shows the platform alert with the title, consequence, Cancel and the action, in that order", async () => {
    const { alert, props, lastCall } = setup();
    await render(<ConfirmDialog {...props} />);
    expect(alert).toHaveBeenCalledTimes(1);
    const [title, message, buttons, options] = lastCall();
    expect(title).toBe("Delete this account?");
    expect(message).toBe("Its balance and history are removed. This cannot be undone.");
    expect(buttons.map((b) => [b.text, b.style])).toEqual([
      ["Cancel", "cancel"],
      ["Delete account", "destructive"],
    ]);
    expect(options.cancelable).toBe(true);
  });

  it("shows nothing while not visible", async () => {
    const { alert, props } = setup({ visible: false });
    await render(<ConfirmDialog {...props} />);
    expect(alert).not.toHaveBeenCalled();
  });

  it("the action button confirms and only confirms", async () => {
    const { props, press } = setup();
    await render(<ConfirmDialog {...props} />);
    press("Delete account");
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  it("Cancel cancels, and a dismiss after it is not a second answer", async () => {
    const { props, press, lastCall } = setup();
    await render(<ConfirmDialog {...props} />);
    press("Cancel");
    lastCall()[3].onDismiss?.();
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("Android's back button (dismiss) counts as Cancel", async () => {
    const { props, lastCall } = setup();
    await render(<ConfirmDialog {...props} />);
    lastCall()[3].onDismiss?.();
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it("the default tone gives the action no destructive role", async () => {
    const { props, lastCall } = setup(confirmDialogStates.signOut);
    await render(<ConfirmDialog {...props} />);
    expect(lastCall()[2][1]).toMatchObject({ text: "Sign out", style: "default" });
  });

  it("a re-render while open does not show it again; showing it again after closing does", async () => {
    const { alert, props } = setup();
    const view = await render(<ConfirmDialog {...props} />);
    await view.rerender(<ConfirmDialog {...props} onConfirm={jest.fn()} />);
    expect(alert).toHaveBeenCalledTimes(1);
    await view.rerender(<ConfirmDialog {...props} visible={false} />);
    await view.rerender(<ConfirmDialog {...props} visible />);
    expect(alert).toHaveBeenCalledTimes(2);
  });

  it("calls the latest handlers, not the ones it was opened with", async () => {
    const { props, press } = setup();
    const view = await render(<ConfirmDialog {...props} />);
    const later = jest.fn();
    await view.rerender(<ConfirmDialog {...props} onConfirm={later} />);
    press("Delete account");
    expect(later).toHaveBeenCalledTimes(1);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
