import { render, screen, userEvent } from "@testing-library/react-native";
import { amountProblem, amountProblemMessage } from "../../features/accounts/accountFormModel";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { BudgetEntryForm, type BudgetEntryFormProps } from "./BudgetEntryForm";
import { budgetEntryFormStates } from "./BudgetEntryForm.states";

const draw = (props: BudgetEntryFormProps) =>
  render(
    <ThemeProvider scheme="light">
      <BudgetEntryForm {...props} />
    </ThemeProvider>,
  );

/** The account forms' check, as the Budget screen gives it. */
const accountsCheck = (value: number | null, text: string) => {
  const problem = amountProblem(value, text);
  return problem ? amountProblemMessage(problem, false) : null;
};

describe("BudgetEntryForm", () => {
  it("adds with web's labels, sending the typed values", async () => {
    const onSave = jest.fn();
    await draw({ ...budgetEntryFormStates.add, onSave });
    expect(screen.getByRole("header", { name: "Add to bills" })).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Name/), "  Water  ");
    await user.type(screen.getByLabelText(/^Amount/), "32.50");
    await user.press(screen.getByRole("radio", { name: /Yearly/ }));
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      name: "Water",
      amount: 32.5,
      frequency: "annual",
      category: "bills",
      isEssential: true,
    });
  });

  it("a missing name or amount says what is needed and sends nothing", async () => {
    const onSave = jest.fn();
    await draw({ ...budgetEntryFormStates.add, onSave });
    // Nothing is said before a save is tried.
    expect(screen.queryByText("Enter a name")).toBeNull();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a name")).toBeOnTheScreen();
    expect(screen.getByText("Enter an amount")).toBeOnTheScreen();
    await user.type(screen.getByLabelText(/^Name/), "Water");
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByText("Enter a name")).toBeNull();
    expect(screen.getByText("Enter an amount")).toBeOnTheScreen();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("an amount at or over the backend's limit names the field and sends nothing; just below goes", async () => {
    // Device check: 99999999999999 sent nothing and said only "We could not add that entry".
    // The contract's Money is below 10 billion: 10,000,000,000 is on the limit, 9,999,999,999.99 under it.
    const onSave = jest.fn();
    const onTry = jest.fn();
    await draw({ ...budgetEntryFormStates.add, onSave, onTry, checkAmount: accountsCheck });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Name/), "Water");
    const amount = screen.getByLabelText(/^Amount/);
    for (const typed of ["99999999999999", "10000000000"]) {
      await user.clear(amount);
      await user.type(amount, typed);
      await user.press(screen.getByRole("button", { name: "Save" }));
      expect(screen.getByText("Enter an amount below £10,000,000,000.")).toBeOnTheScreen();
    }
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(amount);
    await user.type(amount, "9999999999.99");
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByText("Enter an amount below £10,000,000,000.")).toBeNull();
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ amount: 9999999999.99 }));
    // Every press told the screen, so it can clear the last save's error first.
    expect(onTry).toHaveBeenCalledTimes(3);
  });

  it("a minus amount says it cannot be below £0, in the account forms' words, and the top says to fix", async () => {
    // Device re-check: "-5" said only "Enter an amount".
    const onSave = jest.fn();
    const onInvalid = jest.fn();
    await draw({ ...budgetEntryFormStates.add, onSave, onInvalid, checkAmount: accountsCheck });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Name/), "Refund");
    await user.type(screen.getByLabelText(/^Amount/), "-5");
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText("This amount cannot be below £0. Enter it without a minus sign."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Enter an amount")).toBeNull();
    expect(
      screen.getByText("Some details need changing. Each one says what to change."),
    ).toBeOnTheScreen();
    expect(onInvalid).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("a name of spaces only is no name", async () => {
    const onSave = jest.fn();
    await draw({ ...budgetEntryFormStates.add, onSave });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^Name/), "   ");
    await user.type(screen.getByLabelText(/^Amount/), "10");
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Enter a name")).toBeOnTheScreen();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("edits: starts from the entry, changes the category and Essential, and offers Delete", async () => {
    const onSave = jest.fn();
    const onDelete = jest.fn();
    await draw({ ...budgetEntryFormStates.edit, onSave, onDelete });
    expect(screen.getByRole("header", { name: "Edit entry" })).toBeOnTheScreen();
    expect(screen.getByLabelText(/^Name/).props.value).toBe("Energy");
    const user = userEvent.setup();
    await user.press(screen.getByRole("radio", { name: /Expenses/ }));
    await user.press(screen.getByRole("switch", { name: "Essential spending" }));
    await user.press(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith({
      name: "Energy",
      amount: 80,
      frequency: "monthly",
      category: "expenses",
      isEssential: false,
    });
    await user.press(screen.getByRole("button", { name: "Delete entry" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("income has no Essential switch, and adding offers no Delete", async () => {
    await draw(budgetEntryFormStates.income);
    expect(screen.getByRole("header", { name: "Add income" })).toBeOnTheScreen();
    expect(screen.queryByRole("switch", { name: "Essential spending" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete entry" })).toBeNull();
  });

  it("while saving ignores presses", async () => {
    const onSave = jest.fn();
    const onCancel = jest.fn();
    await draw({ ...budgetEntryFormStates.saving, onSave, onCancel });
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Save" }));
    await user.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("shows what went wrong with the last save", async () => {
    await draw(budgetEntryFormStates.failed);
    expect(
      screen.getByText("We could not save your changes. Nothing has changed. Try again."),
    ).toBeOnTheScreen();
  });

  it.each(Object.entries(budgetEntryFormStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<BudgetEntryForm {...props} />);
  });
});
