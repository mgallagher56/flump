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
  ratesAssumed?: boolean;
  methodSet?: boolean;
  factsOpen?: boolean;
}> = ({
  onSave = vi.fn().mockResolvedValue(undefined),
  ratesAssumed = false,
  methodSet = true,
  factsOpen = false,
}) => {
  const [editing, setEditing] = useState(false);
  return (
    <PensionDetails
      factsOpen={factsOpen}
      annualSalary={50000}
      employeePercent={6}
      employerPercent={4}
      hasSalary
      isEditing={editing}
      isSalarySacrifice
      isSalarySacrificeEmployerNi={false}
      methodSet={methodSet}
      ratesAssumed={ratesAssumed}
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
      "You pay6% of salary",
      "Employer pays4% of salary",
      "MethodSalary sacrifice",
    ]);
  });

  it("labels the backend default rates as assumed, once", () => {
    render(<Harness ratesAssumed />);
    fireEvent.click(screen.getByRole("button", { name: "Salary and contributions" }));
    expect(screen.getAllByText(/Assumed: the auto-enrolment minimum/)).toHaveLength(1);
  });

  it("reads the contribution method as Not set until the user saves one", () => {
    render(<Harness methodSet={false} ratesAssumed />);
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
