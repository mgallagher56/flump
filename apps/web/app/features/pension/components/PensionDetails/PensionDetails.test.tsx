import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type FC, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PensionDetails } from "./PensionDetails";

vi.mock("~/hooks/useFormatCurrency", () => ({
  useFormatCurrency: () => ({
    formatCurrency: (v: number) => `£${Math.round(v).toLocaleString("en-GB")}`,
  }),
}));

const Harness: FC<{
  onSave?: () => Promise<void>;
  employeePercent?: number | null;
  employerPercent?: number | null;
  methodSet?: boolean;
  factsOpen?: boolean;
}> = ({
  onSave = vi.fn().mockResolvedValue(undefined),
  employeePercent = 6,
  employerPercent = 4,
  methodSet = true,
  factsOpen = false,
}) => {
  const [editing, setEditing] = useState(false);
  return (
    <PensionDetails
      factsOpen={factsOpen}
      annualSalary={50000}
      employeePercent={employeePercent}
      employerPercent={employerPercent}
      hasSalary
      isEditing={editing}
      isSalarySacrifice
      isSalarySacrificeEmployerNi={false}
      methodSet={methodSet}
      onEditingChange={setEditing}
      onSave={onSave}
    />
  );
};

describe("<PensionDetails />", () => {
  it("keeps the saved facts behind a closed drawer, one figure per row when opened", () => {
    render(<Harness />);
    expect(document.querySelector("dl")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    expect(screen.getByRole("heading", { level: 2, name: "Your details" })).toBeDefined();
    const rows = Array.from(document.querySelectorAll("dl > div")).map((r) => r.textContent);
    expect(rows).toEqual([
      "Salary£50,000 a year",
      // £50,000 at 6%: 3,000 a year ÷ 12 = £250 a month. At 4%: 2,000 ÷ 12 = £166.67, about £167.
      "You pay6% of salary, about £250 a month",
      "Employer pays4% of salary, about £167 a month",
      "MethodSalary sacrifice",
    ]);
  });

  it("reads a rate that is not set as Not set, never 5%, 3% or 0%", () => {
    render(<Harness employeePercent={null} employerPercent={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    expect(screen.getByText("You pay").nextElementSibling?.textContent).toBe("Not set");
    expect(screen.getByText("Employer pays").nextElementSibling?.textContent).toBe("Not set");
    expect(
      screen.getAllByText("Add your rates from your payslip to see what goes in each month."),
    ).toHaveLength(1);
    expect(screen.queryByText(/Assumed/)).toBeNull();
    expect(screen.queryByText(/\d%/)).toBeNull();
  });

  it("shows a chosen 5% and 3% as chosen, with no note", () => {
    render(<Harness employeePercent={5} employerPercent={3} />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    // £50,000 at 5%: 2,500 ÷ 12 = £208.33, about £208. At 3%: 1,500 ÷ 12 = £125.
    expect(screen.getByText("You pay").nextElementSibling?.textContent).toBe(
      "5% of salary, about £208 a month",
    );
    expect(screen.getByText("Employer pays").nextElementSibling?.textContent).toBe(
      "3% of salary, about £125 a month",
    );
    expect(screen.queryByText(/Add your rates/)).toBeNull();
  });

  it("starts the form blank for a rate that is not set, and saves a blank as blank", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness employeePercent={null} employerPercent={null} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    expect((screen.getByLabelText(/Your contribution/) as HTMLInputElement).value).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ employeePercent: null, employerPercent: null }),
      ),
    );
  });

  it("reads the contribution method as Not set until the user saves one", () => {
    render(<Harness methodSet={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    expect(screen.getByText("Method").nextElementSibling?.textContent).toBe("Not set");
    expect(screen.queryByText(/^Salary sacrifice$/)).toBeNull();
  });

  it("edits and saves the salary sacrifice settings", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    expect(
      (screen.getByLabelText(/Employer adds its National Insurance/) as HTMLInputElement).checked,
    ).toBe(false);
    fireEvent.click(screen.getByLabelText(/Employer adds its National Insurance/));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        annualSalary: 50000,
        employeePercent: 6,
        employerPercent: 4,
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
        methodChanged: true,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Save details" })).toBeNull());
  });

  it("marks the method unchanged when only the salary is edited", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    fireEvent.change(screen.getByLabelText(/Yearly salary before tax/), {
      target: { value: "60000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ methodChanged: false })),
    );
  });

  it("lets the salary be cleared without snapping back to 0", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    const salary = screen.getByLabelText(/Yearly salary before tax/) as HTMLInputElement;
    fireEvent.change(salary, { target: { value: "" } });
    expect(salary.value).toBe("");
  });

  it("stays open when saving fails, and Cancel closes without saving", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    render(<Harness onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit salary and contributions" }));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Save details" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Save details" })).toBeNull();
    error.mockRestore();
  });

  it("has one edit button, inside the drawer, and opens the drawer for the deep link", () => {
    const { unmount } = render(<Harness />);
    expect(screen.queryByRole("button", { name: /Edit details/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit salary and contributions" })).toBeNull();
    unmount();
    render(<Harness factsOpen />);
    expect(screen.getByRole("button", { name: "Edit salary and contributions" })).toBeDefined();
  });
});
