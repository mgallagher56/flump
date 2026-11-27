import { render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { BudgetCategoryList, type BudgetCategoryListProps } from "./BudgetCategoryList";
import { budgetCategoryListStates } from "./BudgetCategoryList.states";

const draw = (props: BudgetCategoryListProps) =>
  render(
    <ThemeProvider scheme="light">
      <BudgetCategoryList {...props} />
    </ThemeProvider>,
  );

describe("BudgetCategoryList", () => {
  it("lists the rows in the engine's order, each one control naming the tenure and figure", async () => {
    await draw(budgetCategoryListStates.renter);
    expect(screen.getByRole("header", { name: "Where your money goes" })).toBeOnTheScreen();
    const rows = screen.getAllByRole("button");
    expect(rows.map((r) => r.props.accessibilityLabel)).toEqual([
      "Housing, Renting, £950",
      "Expenses, £565",
      "Bills, £295",
    ]);
    // No edit action unless the screen offers one.
    expect(screen.queryByRole("button", { name: "Edit budget" })).toBeNull();
  });

  it("opens one category at a time, its entries read only with their figures", async () => {
    await draw(budgetCategoryListStates.renter);
    const user = userEvent.setup();
    const expenses = screen.getByRole("button", { name: "Expenses, £565" });
    expect(expenses.props.accessibilityState).toMatchObject({ expanded: false });
    expect(screen.queryByText("Groceries")).toBeNull();
    await user.press(expenses);
    expect(
      screen.getByRole("button", { name: "Expenses, £565" }).props.accessibilityState,
    ).toMatchObject({ expanded: true });
    expect(screen.getByLabelText("Groceries, £250")).toBeOnTheScreen();
    expect(screen.getByLabelText("Travel, £120")).toBeOnTheScreen();
    // Opening another closes the first.
    await user.press(screen.getByRole("button", { name: "Bills, £295" }));
    expect(screen.queryByText("Groceries")).toBeNull();
    expect(screen.getByLabelText("Council tax, £115")).toBeOnTheScreen();
    // Pressing the open one closes it.
    await user.press(screen.getByRole("button", { name: "Bills, £295" }));
    expect(screen.queryByText("Council tax")).toBeNull();
  });

  it("a single entry shows its name only: its figure would repeat the row's", async () => {
    await draw(budgetCategoryListStates.renter);
    await userEvent.setup().press(screen.getByRole("button", { name: "Housing, Renting, £950" }));
    expect(screen.getByLabelText("Rent")).toBeOnTheScreen();
  });

  it("a linked line that is not set reads Not set with its source, never £0", async () => {
    await draw(budgetCategoryListStates.notSet);
    const row = screen.getByRole("button", { name: "Savings, Not set" });
    await userEvent.setup().press(row);
    expect(
      screen.getByLabelText(
        "ISA saving, Not set, Linked to Stocks ISA, which has no monthly saving saved",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("£0")).toBeNull();
  });

  it("a mortgage holder's housing row is a link that says where it goes", async () => {
    const go = jest.fn();
    await draw({ ...budgetCategoryListStates.mortgageLink, linkFor: () => go });
    const link = screen.getByRole("link", {
      name: "Housing, Mortgage, £1,250 a month, open the mortgage page on the website",
    });
    await userEvent.setup().press(link);
    expect(go).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Rent")).toBeNull();
  });

  it("Edit budget calls back", async () => {
    const onEditBudget = jest.fn();
    await draw({ ...budgetCategoryListStates.withEdit, onEditBudget });
    await userEvent.setup().press(screen.getByRole("button", { name: "Edit budget" }));
    expect(onEditBudget).toHaveBeenCalledTimes(1);
  });

  it.each(Object.entries(budgetCategoryListStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<BudgetCategoryList {...props} />);
  });
});
