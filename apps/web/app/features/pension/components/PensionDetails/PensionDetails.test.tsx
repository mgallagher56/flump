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
  updatedAt?: string | null;
}> = ({
  onSave = vi.fn().mockResolvedValue(undefined),
  ratesAssumed = false,
  methodSet = true,
  updatedAt = null,
}) => {
  const [editing, setEditing] = useState(false);
  return (
    <PensionDetails
      annualSalary={50000}
      employeePercent={6}
      employerPercent={4}
      hasSalary
      isEditing={editing}
      isSalarySacrifice
      isSalarySacrificeEmployerNi={false}
      monthlyEmployeeContrib={250}
      monthlyEmployerNiContrib={0}
      methodSet={methodSet}
      ratesAssumed={ratesAssumed}
      standardMonthlyEmployerContrib={167}
      updatedAt={updatedAt}
      onEditingChange={setEditing}
      onSave={onSave}
    />
  );
};

describe("<PensionDetails />", () => {
  it("shows saved facts with the Saved state and last updated date", () => {
    render(<Harness updatedAt="2026-11-05T10:30:00.000Z" />);
    expect(screen.getByRole("heading", { level: 2, name: "Your details" })).toBeDefined();
    expect(screen.getByText("Saved")).toBeDefined();
    expect(screen.getByText("5 Nov 2026")).toBeDefined();
    expect(screen.getByText(/You:/).parentElement?.textContent).toContain("6%");
    expect(screen.getByText(/Employer:/).parentElement?.textContent).toContain("4%");
    expect(screen.getByText("£50,000 a year")).toBeDefined();
  });

  it("labels the backend default rates as assumed", () => {
    render(<Harness ratesAssumed />);
    expect(screen.getAllByText(/Default: auto-enrolment minimum/)).toHaveLength(2);
  });

  it("reads the contribution method as Not set until the user saves one", () => {
    render(<Harness methodSet={false} ratesAssumed />);
    expect(screen.getByText(/Contribution method: Not set/)).toBeDefined();
    expect(screen.queryByText(/Salary sacrifice$/)).toBeNull();
  });

  it("edits and saves the salary sacrifice settings", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<Harness onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect((screen.getByLabelText(/Pass on employer NI/) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText(/Pass on employer NI/));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        annualSalary: 50000,
        employeePercent: 6,
        employerPercent: 4,
        isSalarySacrifice: true,
        isSalarySacrificeEmployerNi: true,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Save details" })).toBeNull());
  });

  it("lets the salary be cleared without snapping back to 0", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    const salary = screen.getByLabelText(/Annual salary/) as HTMLInputElement;
    fireEvent.change(salary, { target: { value: "" } });
    expect(salary.value).toBe("");
  });

  it("stays open when saving fails, and Cancel closes without saving", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    render(<Harness onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.click(screen.getByRole("button", { name: "Save details" }));
    await waitFor(() => expect(error).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Save details" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("button", { name: "Save details" })).toBeNull();
    error.mockRestore();
  });
});
