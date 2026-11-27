import { dark, light } from "@flump/tokens/native";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, type TextStyle } from "react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { CurrencyInput } from "../CurrencyInput";
import { Text } from "../Text";
import { FormField } from "./FormField";
import { formFieldStates } from "./FormField.states";

const textOf = (words: string) =>
  StyleSheet.flatten(screen.getByText(words).props.style) as TextStyle;

describe("FormField", () => {
  it("shows the label, the control and the hint", async () => {
    await render(
      <ThemeProvider scheme="light">
        <FormField label="Savings" hint="The balance on your latest statement.">
          <Text>control</Text>
        </FormField>
      </ThemeProvider>,
    );
    expect(screen.getByText("Savings")).toBeOnTheScreen();
    expect(screen.getByText("control")).toBeOnTheScreen();
    expect(textOf("The balance on your latest statement.").color).toBe(
      light.colors["text.secondary"],
    );
  });

  it("shows no error text when there is no error", async () => {
    await render(
      <ThemeProvider scheme="light">
        <FormField label="Savings" error={null}>
          <Text>control</Text>
        </FormField>
      </ThemeProvider>,
    );
    expect(screen.queryByText("Enter an amount in pounds.")).toBeNull();
    expect(screen.getAllByText(/.+/)).toHaveLength(2);
  });

  it.each([
    ["light", light],
    ["dark", dark],
  ] as const)("an error is red, read out politely, in %s", async (scheme, tokens) => {
    await render(
      <ThemeProvider scheme={scheme}>
        <FormField label="Savings" error="Enter an amount in pounds.">
          <Text>control</Text>
        </FormField>
      </ThemeProvider>,
    );
    const error = screen.getByText("Enter an amount in pounds.");
    expect(error.props.accessibilityLiveRegion).toBe("polite");
    expect(textOf("Enter an amount in pounds.").color).toBe(tokens.colors["status.danger.text"]);
    expect(textOf("Savings").color).toBe(tokens.colors["text.primary"]);
  });

  it.each(Object.entries(formFieldStates))("%s holds at 200%% text", async (_name, props) => {
    await expectHoldsAtDoubleText(<FormField {...props} />);
  });
});

describe("FormField's error on its control (S8 device check)", () => {
  it("the control inside carries the error in its accessible name; its hint stays its own", async () => {
    await render(
      <ThemeProvider scheme="light">
        <FormField label="Balance" error="Enter the balance. Use 0 if it is empty.">
          <CurrencyInput
            value={null}
            onValueChange={jest.fn()}
            accessibilityLabel="Balance"
            accessibilityHint="Your latest statement balance"
            testID="b"
          />
        </FormField>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("b").props.accessibilityLabel).toBe(
      "Balance. Enter the balance. Use 0 if it is empty.",
    );
    expect(screen.getByTestId("b").props.accessibilityHint).toBe("Your latest statement balance");
  });

  it("with no error the control keeps its own name and hint", async () => {
    await render(
      <ThemeProvider scheme="light">
        <FormField label="Balance">
          <CurrencyInput
            value={null}
            onValueChange={jest.fn()}
            accessibilityLabel="Balance"
            accessibilityHint="Your latest statement balance"
            testID="b"
          />
        </FormField>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("b").props.accessibilityHint).toBe("Your latest statement balance");
    expect(screen.getByTestId("b").props.accessibilityLabel).toBe("Balance");
  });
});
