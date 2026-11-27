import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { BudgetEditor, type BudgetEditorProps } from "./BudgetEditor";
import { budgetEditorStates } from "./BudgetEditor.states";

const draw = (props: BudgetEditorProps) =>
  render(
    <ThemeProvider scheme="light">
      <BudgetEditor {...props} />
    </ThemeProvider>,
  );

describe("BudgetEditor", () => {
  it("lists Money in first, then each category, with web's add buttons", async () => {
    await draw(budgetEditorStates.renter);
    expect(screen.getAllByRole("header").map((h) => h.props.children)).toEqual([
      "Edit your budget",
      "Money in",
      "Housing",
      "Bills",
      "Savings",
    ]);
    expect(screen.getByRole("button", { name: "Add income" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add to housing" })).toBeOnTheScreen();
    expect(screen.getByText("No entries added")).toBeOnTheScreen();
  });

  it("an own entry is one control that opens it; Add opens its category", async () => {
    const onEdit = jest.fn();
    const onAdd = jest.fn();
    await draw({ ...budgetEditorStates.renter, onEdit, onAdd });
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Rent, £950 a month" }));
    expect(onEdit).toHaveBeenCalledWith("rent");
    await user.press(screen.getByRole("button", { name: "Add to savings" }));
    expect(onAdd).toHaveBeenCalledWith("savings");
  });

  it("a joint or linked entry is read only: one link to the website", async () => {
    const onEdit = jest.fn();
    const onOpenWebsite = jest.fn();
    await draw({ ...budgetEditorStates.renter, onEdit, onOpenWebsite });
    const shared = screen.getByRole("link", {
      name: "Shared energy, £1,200 a year, Change it on the website",
    });
    await userEvent.setup().press(shared);
    expect(onOpenWebsite).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("a linked line that is not set reads Not set, never £0", async () => {
    await draw(budgetEditorStates.linkedNotSet);
    expect(
      screen.getByRole("link", { name: "Take-home pay, Not set, Change it on the website" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("Finish editing calls back", async () => {
    const onFinish = jest.fn();
    await draw({ ...budgetEditorStates.renter, onFinish });
    await userEvent.setup().press(screen.getByRole("button", { name: "Finish editing" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("shows pence on fractional amounts and whole pounds on whole amounts", async () => {
    await draw({
      ...budgetEditorStates.renter,
      sections: [
        {
          category: "expenses",
          rows: [
            // Hand-worked: 12.34 has 34 pence -> £12.34; 12.5 has 50 pence -> £12.50.
            { id: "coffee", name: "Coffee", amount: 12.34, frequency: "monthly", editable: true },
            {
              id: "streaming",
              name: "Streaming",
              amount: 12.5,
              frequency: "monthly",
              editable: true,
            },
            // Whole pounds stay whole: 12 -> £12; 12.999 rounds to 1300 pence -> £13.
            { id: "club", name: "Club", amount: 12, frequency: "monthly", editable: true },
            { id: "pass", name: "Pass", amount: 12.999, frequency: "monthly", editable: true },
          ],
        },
      ],
    });
    expect(screen.getByRole("button", { name: "Coffee, £12.34 a month" })).toBeOnTheScreen();
    expect(screen.getByText("£12.34")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Streaming, £12.50 a month" })).toBeOnTheScreen();
    expect(screen.getByText("£12.50")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Club, £12 a month" })).toBeOnTheScreen();
    expect(screen.getByText("£12")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Pass, £13 a month" })).toBeOnTheScreen();
    expect(screen.getByText("£13")).toBeOnTheScreen();
  });

  it.each(Object.entries(budgetEditorStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<BudgetEditor {...props} />);
  });
});
