import { light } from "@flump/tokens/native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet, type ViewStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { PhraseConfirm, type PhraseConfirmProps, phraseMatches } from "./PhraseConfirm";
import { phraseConfirmStates } from "./PhraseConfirm.states";

const base: PhraseConfirmProps = {
  phrase: "DELETE",
  label: "Type DELETE to confirm",
  confirmLabel: "Delete my account",
  pendingLabel: "Deleting",
  onConfirm: () => undefined,
};

async function show(props: Partial<PhraseConfirmProps> = {}) {
  const onConfirm = jest.fn();
  await render(
    <ThemeProvider scheme="light">
      <PhraseConfirm {...base} onConfirm={onConfirm} {...props} />
    </ThemeProvider>,
  );
  return onConfirm;
}

const button = (name: string) => screen.getByRole("button", { name });
const fillOf = (name: string) =>
  (StyleSheet.flatten(button(name).props.style) as ViewStyle).backgroundColor;

describe("phraseMatches", () => {
  it.each([
    ["DELETE", true],
    [" delete ", true],
    ["Delete", true],
    ["DELET", false],
    ["DELETED", false],
    ["", false],
  ])("%j matches: %s", (typed, expected) => {
    expect(phraseMatches(typed, "DELETE")).toBe(expected);
  });
});

describe("PhraseConfirm", () => {
  it("the danger button is disabled, and not red, until the phrase matches", async () => {
    const onConfirm = await show();
    expect(button("Delete my account")).toBeDisabled();
    expect(fillOf("Delete my account")).not.toBe(light.colors["status.danger.solid"]);
    await fireEvent.press(button("Delete my account"));
    expect(onConfirm).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELET");
    expect(button("Delete my account")).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    expect(button("Delete my account")).toBeEnabled();
    expect(fillOf("Delete my account")).toBe(light.colors["status.danger.solid"]);
    await fireEvent.press(button("Delete my account"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("the field takes the phrase as typed: no autocorrect, capitals on", async () => {
    await show();
    const field = screen.getByLabelText("Type DELETE to confirm");
    expect(field.props.autoCorrect).toBe(false);
    expect(field.props.autoCapitalize).toBe("characters");
    expect(field.props.autoComplete).toBe("off");
  });

  it("while pending: says so, ignores presses and locks the field", async () => {
    const onConfirm = await show({ pending: true });
    expect(screen.queryByText("Delete my account")).toBeNull();
    const pending = button("Deleting");
    expect(pending.props.accessibilityState).toEqual(expect.objectContaining({ busy: true }));
    await fireEvent.press(pending);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Type DELETE to confirm").props.editable).toBe(false);
  });

  it("shows the outcome as an alert, and the follow-up action when given", async () => {
    const onAction = jest.fn();
    await show({
      message: { text: "For your security, sign in again, then try again.", tone: "danger" },
      action: { label: "Sign in again", onPress: onAction },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "For your security, sign in again, then try again.",
    );
    await fireEvent.press(button("Sign in again"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("disabled (offline): the phrase typed still sends nothing", async () => {
    const onConfirm = await show({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    expect(button("Delete my account")).toBeDisabled();
    await fireEvent.press(button("Delete my account"));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("with no message there is no alert and no action", async () => {
    await show();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign in again" })).toBeNull();
  });

  it("a pending action shows its own busy state and ignores presses", async () => {
    const onAction = jest.fn();
    await show({
      message: { text: "Sign in again first.", tone: "danger" },
      action: { label: "Sign in again", onPress: onAction, pending: true },
    });
    await fireEvent.press(button("Sign in again"));
    expect(onAction).not.toHaveBeenCalled();
  });

  it.each(Object.entries(phraseConfirmStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<PhraseConfirm {...props} />);
  });
});
