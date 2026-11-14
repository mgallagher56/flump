import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { NetWorthChoices, type NetWorthChoicesProps } from "./NetWorthChoices";

const setup = (props: Partial<NetWorthChoicesProps> = {}) => {
  const onSave = props.onSave ?? vi.fn().mockResolvedValue(undefined);
  render(<NetWorthChoices countProperty countStudentLoan={false} onSave={onSave} {...props} />);
  return { onSave };
};

const propertySwitch = () =>
  screen.getByRole("switch", {
    name: "Count property I own, less the mortgage on it, in my net worth.",
  });
const studentLoanSwitch = () =>
  screen.getByRole("switch", { name: "Count my student loan as a debt in my net worth." });

describe("<NetWorthChoices />", () => {
  test("a section anchored at #net-worth with its title, helper and the saved choices", () => {
    setup();
    const section = screen.getByRole("region", { name: "What counts in your net worth" });
    expect(section.id).toBe("net-worth");
    expect(section.textContent).toContain(
      "Other loans, including ones secured on your home, always count.",
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

  test("a failed save puts the switch back and says nothing changed", async () => {
    setup({ onSave: vi.fn().mockRejectedValue(new Error("nope")) });
    fireEvent.click(propertySwitch());
    expect((await screen.findByRole("alert")).textContent).toBe(
      "We could not save that change. Nothing has changed. Try again.",
    );
    expect((propertySwitch() as HTMLInputElement).checked).toBe(true);
  });
});
