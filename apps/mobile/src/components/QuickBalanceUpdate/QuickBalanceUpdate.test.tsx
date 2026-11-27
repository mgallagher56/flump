import { dark, light } from "@flump/tokens/native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { QuickBalanceUpdate } from "./QuickBalanceUpdate";
import { quickBalanceUpdateStates } from "./QuickBalanceUpdate.states";

type Props = Parameters<typeof QuickBalanceUpdate>[0];

const ui = (props: Partial<Props> = {}, scheme: "light" | "dark" = "light") => (
  <ThemeProvider scheme={scheme}>
    <QuickBalanceUpdate {...quickBalanceUpdateStates.balance} {...props} />
  </ThemeProvider>
);

const openIt = async () => fireEvent.press(screen.getByTestId("quick-balance-open"));
const field = () => screen.getByTestId("quick-balance-value");

describe("QuickBalanceUpdate", () => {
  it("is a quiet button that says which figure it updates", async () => {
    await render(ui());
    expect(screen.getByRole("button", { name: "Update balance" })).toBeOnTheScreen();
    await render(ui(quickBalanceUpdateStates.owed));
    expect(screen.getByRole("button", { name: "Update amount owed" })).toBeOnTheScreen();
    expect(screen.queryByTestId("quick-balance-form")).toBeNull();
  });

  it("opens one field holding the saved figure, named with the account", async () => {
    await render(ui());
    await openIt();
    expect(field().props.accessibilityLabel).toBe("New balance, Holiday fund");
    expect(field().props.value).toBe("1,250");
    await render(ui(quickBalanceUpdateStates.owed));
    await openIt();
    expect(field().props.accessibilityLabel).toBe("Amount owed now, Credit card");
    expect(field().props.value).toBe("480.50");
  });

  it("shows the joint hint under the field", async () => {
    await render(ui(quickBalanceUpdateStates.joint));
    await openIt();
    expect(
      screen.getByText("This is the whole balance. Your share is 50% of it."),
    ).toBeOnTheScreen();
  });

  it("saves the figure typed and closes once it saved", async () => {
    const onSave = jest.fn(async () => null);
    await render(ui({ onSave }));
    await openIt();
    await fireEvent.changeText(field(), "1,300.25");
    await fireEvent.press(screen.getByTestId("quick-balance-save"));
    expect(onSave.mock.calls).toEqual([[1300.25]]);
    await waitFor(() => expect(screen.queryByTestId("quick-balance-form")).toBeNull());
    expect(screen.getByTestId("quick-balance-open")).toBeOnTheScreen();
  });

  it("a failed save keeps the field and what was typed, and says what went wrong", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const onSave = jest.fn(
      async () => "We could not reach Flump. Check your connection and try again.",
    );
    await render(ui({ onSave }));
    await openIt();
    await fireEvent.changeText(field(), "99");
    await fireEvent.press(screen.getByTestId("quick-balance-save"));
    expect(await screen.findByTestId("quick-balance-error")).toHaveTextContent(
      "We could not reach Flump. Check your connection and try again.",
    );
    expect(field().props.value).toBe("99");
    expect(announce).toHaveBeenCalledWith(
      "We could not reach Flump. Check your connection and try again.",
    );
  });

  it("sends nothing while the field is blank or cannot be read", async () => {
    const onSave = jest.fn(async () => null);
    await render(ui({ onSave }));
    await openIt();
    await fireEvent.changeText(field(), "");
    await fireEvent.press(screen.getByTestId("quick-balance-save"));
    await fireEvent.changeText(field(), "12.345");
    await fireEvent.press(screen.getByTestId("quick-balance-save"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Cancel closes without saving, and opening again starts from the saved figure", async () => {
    const onSave = jest.fn(async () => null);
    await render(ui({ onSave }));
    await openIt();
    await fireEvent.changeText(field(), "5");
    await fireEvent.press(screen.getByTestId("quick-balance-cancel"));
    expect(onSave).not.toHaveBeenCalled();
    await openIt();
    expect(field().props.value).toBe("1,250");
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("%s: renders its field in the theme", async (scheme, _tokens) => {
    await render(ui({}, scheme));
    await openIt();
    expect(screen.getByTestId("quick-balance-form")).toBeOnTheScreen();
  });
});

describe("QuickBalanceUpdate below zero", () => {
  it("a balance can be saved below zero; an amount owed cannot be typed below zero", async () => {
    const onSave = jest.fn(async () => null);
    await render(ui({ onSave }));
    await openIt();
    await fireEvent.changeText(field(), "-40");
    await fireEvent.press(screen.getByTestId("quick-balance-save"));
    expect(onSave.mock.calls).toEqual([[-40]]);

    const onSaveOwed = jest.fn(async () => null);
    await render(ui({ ...quickBalanceUpdateStates.owed, onSave: onSaveOwed }));
    await openIt();
    await fireEvent.changeText(field(), "-40");
    await fireEvent.press(screen.getByTestId("quick-balance-save"));
    expect(onSaveOwed).not.toHaveBeenCalled();
  });
});
