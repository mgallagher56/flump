import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { NetWorthChoices, type NetWorthChoicesProps } from "./NetWorthChoices";

const setup = (props: Partial<NetWorthChoicesProps> = {}) => {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(<NetWorthChoices countProperty countStudentLoan={false} onSave={onSave} {...props} />);
  return { onSave };
};

const propertySwitch = () =>
  screen.getByRole("switch", {
    name: "Count property you own, less the mortgage on it",
  });
const studentLoanSwitch = () =>
  screen.getByRole("switch", { name: "Count your student loan as a debt" });

describe("<NetWorthChoices />", () => {
  test("a section anchored at #net-worth with its title, helper and the saved choices", () => {
    setup();
    const section = screen.getByRole("region", { name: "What counts in your net worth" });
    expect(section.id).toBe("net-worth");
    expect(section.textContent).toContain(
      "Other debts, including loans secured on your home, always count.",
    );
    expect((propertySwitch() as HTMLInputElement).checked).toBe(true);
    expect((studentLoanSwitch() as HTMLInputElement).checked).toBe(false);
  });

  test("switching the student loan on saves that one field", async () => {
    const { onSave } = setup();
    fireEvent.click(studentLoanSwitch());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ netWorthCountsStudentLoan: true }));
    expect((studentLoanSwitch() as HTMLInputElement).checked).toBe(true);
  });

  test("switching property off saves that one field", async () => {
    const { onSave } = setup();
    fireEvent.click(propertySwitch());
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ netWorthCountsProperty: false }));
  });

  test("both switches are described by the helper", () => {
    setup();
    expect(propertySwitch().getAttribute("aria-describedby")).toBe("net-worth-choices-helper");
    expect(studentLoanSwitch().getAttribute("aria-describedby")).toBe("net-worth-choices-helper");
  });

  test("while saving, the switches stay enabled and focused, and further changes are ignored", async () => {
    let finish: () => void = () => {};
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    setup({ onSave });
    propertySwitch().focus();
    fireEvent.click(propertySwitch());
    await waitFor(() => expect(propertySwitch().getAttribute("aria-disabled")).toBe("true"));
    expect((propertySwitch() as HTMLInputElement).disabled).toBe(false);
    expect(document.activeElement).toBe(propertySwitch());
    fireEvent.click(studentLoanSwitch());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect((studentLoanSwitch() as HTMLInputElement).checked).toBe(false);
    finish();
    await waitFor(() => expect(propertySwitch().getAttribute("aria-disabled")).toBeNull());
    expect((propertySwitch() as HTMLInputElement).checked).toBe(false);
  });

  test("the keyboard toggles a switch with Space", async () => {
    const user = userEvent.setup();
    const { onSave } = setup();
    await user.tab();
    expect(document.activeElement).toBe(propertySwitch());
    await user.keyboard(" ");
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ netWorthCountsProperty: false }));
    expect(document.activeElement).toBe(propertySwitch());
  });

  test("a failed save puts the switch back and says nothing changed", async () => {
    setup({ onSave: vi.fn().mockRejectedValue(new Error("nope")) });
    fireEvent.click(propertySwitch());
    expect((await screen.findByRole("alert")).textContent).toBe(
      "We could not save that change. Nothing has changed. Try again.",
    );
    expect((propertySwitch() as HTMLInputElement).checked).toBe(true);
  });
});
