import { act, render, screen, userEvent } from "@testing-library/react-native";
import { expectHoldsAtDoubleText } from "../../testing/textScale";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { BreathingRoom, type BreathingRoomProps } from "./BreathingRoom";
import { breathingRoomStates } from "./BreathingRoom.states";

const draw = (props: BreathingRoomProps) =>
  render(
    <ThemeProvider scheme="light">
      <BreathingRoom {...props} />
    </ThemeProvider>,
  );

describe("BreathingRoom", () => {
  it("shows the saved figure in words with where it comes from", async () => {
    await draw(breathingRoomStates.renter);
    // 5.08 months to one decimal place: "About 5.1 months" (the engine's wording).
    expect(screen.getByLabelText("Breathing room, About 5.1 months")).toBeOnTheScreen();
    expect(
      screen.getByText("From your savings of £8,200 and essentials of £1,615 a month."),
    ).toBeOnTheScreen();
  });

  it("from a year, the whole months round down (D9): the device check's 16.5 is 1 year 4 months", async () => {
    // 21,000 / 1,275 = 16.47, stored as 16.5: 16 whole months, never 17 (rounded up twice).
    await draw({
      ...breathingRoomStates.renter,
      figure: { months: 16.5, liquidCash: 21000, monthlyEssentials: 1275 },
    });
    expect(screen.getByLabelText("Breathing room, About 1 year 4 months")).toBeOnTheScreen();
  });

  it("with no saved figure, says what to add, never 0 months", async () => {
    await draw(breathingRoomStates.notSet);
    expect(screen.getByText("Add your essential spending to see this.")).toBeOnTheScreen();
    expect(screen.queryByText(/0 months/)).toBeNull();
    expect(screen.queryByTestId("breathing-room-source")).toBeNull();
  });

  it("View your savings accounts opens them", async () => {
    const onViewSavings = jest.fn();
    await draw({ ...breathingRoomStates.renter, onViewSavings });
    await userEvent.setup().press(screen.getByRole("link", { name: "View your savings accounts" }));
    expect(onViewSavings).toHaveBeenCalledTimes(1);
  });

  it("the drawer says what it counts; a switch saves the entry's Essential flag", async () => {
    let finish: (v?: unknown) => void = () => undefined;
    const onSetEssential = jest.fn(() => new Promise((resolve) => (finish = resolve)));
    await draw({ ...breathingRoomStates.renter, onSetEssential });
    expect(screen.getByText("1 account, 2 of 3 spending entries")).toBeOnTheScreen();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Show what counts" }));
    expect(screen.getByLabelText("Easy access savings, £8,200")).toBeOnTheScreen();
    const eating = screen.getByRole("switch", { name: "Eating out" });
    expect(eating.props.accessibilityState).toMatchObject({ checked: false });
    expect(eating.props.accessibilityHint).toBe("Expenses, £90 a month");
    await user.press(eating);
    expect(onSetEssential).toHaveBeenCalledWith("eating", true);
    // Busy while the save runs: a second press sends nothing.
    expect(
      screen.getByRole("switch", { name: "Eating out" }).props.accessibilityState,
    ).toMatchObject({ busy: true });
    await user.press(screen.getByRole("switch", { name: "Eating out" }));
    expect(onSetEssential).toHaveBeenCalledTimes(1);
    await act(async () => finish());
    expect(
      screen.getByRole("switch", { name: "Eating out" }).props.accessibilityState,
    ).toMatchObject({ busy: false });
  });

  it("a debt payment always counts: its switch is on, disabled, and says why", async () => {
    const onSetEssential = jest.fn();
    await draw({ ...breathingRoomStates.renter, onSetEssential });
    await userEvent.setup().press(screen.getByRole("button", { name: "Show what counts" }));
    const card = screen.getByRole("switch", { name: "Credit card payment" });
    expect(card.props.accessibilityState).toMatchObject({ checked: true, disabled: true });
    expect(card.props.accessibilityHint).toBe(
      "Debt, £60 a month. Debt payments are always counted",
    );
    await userEvent.setup().press(card);
    expect(onSetEssential).not.toHaveBeenCalled();
  });

  it("a row the phone cannot save has its switch disabled", async () => {
    const onSetEssential = jest.fn();
    await draw({ ...breathingRoomStates.readOnlyRow, onSetEssential });
    await userEvent.setup().press(screen.getByRole("button", { name: "Show what counts" }));
    const row = screen.getByRole("switch", { name: "Shared groceries" });
    expect(row.props.accessibilityState).toMatchObject({ disabled: true });
    await userEvent.setup().press(row);
    expect(onSetEssential).not.toHaveBeenCalled();
  });

  it("with no accounts or spending, says so", async () => {
    await draw(breathingRoomStates.notSet);
    await userEvent.setup().press(screen.getByRole("button", { name: "Show what counts" }));
    expect(screen.getByText("No current or savings accounts yet.")).toBeOnTheScreen();
    expect(screen.getByText("No spending entries yet.")).toBeOnTheScreen();
    expect(screen.getByText("0 accounts, 0 of 0 spending entries")).toBeOnTheScreen();
  });

  it.each(Object.entries(breathingRoomStates))("%s holds at 200%% text", async (_n, props) => {
    await expectHoldsAtDoubleText(<BreathingRoom {...props} />);
  });
});
