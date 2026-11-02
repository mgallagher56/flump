import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: vi.fn(),
    state: "idle",
  }),
}));

import AddPensionAccountDialog from "./AddPensionAccountDialog";

describe("AddPensionAccountDialog", () => {
  it("renders modal form fields when open", () => {
    render(<AddPensionAccountDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Add Pension Pot" })).toBeDefined();
    expect(screen.getByLabelText("Pot / Provider Name")).toBeDefined();
    expect(screen.getByLabelText("Current Value (£)")).toBeDefined();
    expect(screen.getByLabelText("Expected Return (% p.a.)")).toBeDefined();
    expect(screen.getByLabelText("Specific Direct Contribution (£/month, optional)")).toBeDefined();
  });

  it("populates fields when editing an existing pot", () => {
    const existingPot = {
      id: "pot-123",
      name: "Vanguard SIPP",
      balance: 15000,
      interestRate: 7.0,
      monthlyContribution: 200,
      type: "Pension",
    };

    render(
      <AddPensionAccountDialog
        accountToEdit={existingPot as any}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Edit Pension Pot")).toBeDefined();
    const nameInput = screen.getByLabelText("Pot / Provider Name") as HTMLInputElement;
    expect(nameInput.value).toBe("Vanguard SIPP");
    const balanceInput = screen.getByLabelText("Current Value (£)") as HTMLInputElement;
    expect(balanceInput.value).toBe("15000");
  });

  it("disables direct contribution input when Past Pot is selected", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(<AddPensionAccountDialog isOpen={true} onClose={vi.fn()} />);

    const pastPotRadio = screen.getByRole("radio", { name: /Past Pot/i });
    const directContribInput = screen.getByLabelText(
      "Specific Direct Contribution (£/month, optional)",
    ) as HTMLInputElement;

    expect(directContribInput.disabled).toBe(false);

    fireEvent.click(pastPotRadio);

    expect(directContribInput.disabled).toBe(true);
    expect(directContribInput.value).toBe("");
  });

  it("populates past pot correctly with disabled direct contribution", () => {
    const existingPastPot = {
      id: "pot-past",
      name: "Old Employer Pension",
      balance: 12000,
      interestRate: 4.5,
      monthlyContribution: null,
      isCurrent: false,
      type: "Pension",
    };

    render(
      <AddPensionAccountDialog
        accountToEdit={existingPastPot as any}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    const directContribInput = screen.getByLabelText(
      "Specific Direct Contribution (£/month, optional)",
    ) as HTMLInputElement;
    expect(directContribInput.disabled).toBe(true);
    expect(directContribInput.value).toBe("");
  });
});
