import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.hoisted(() => vi.fn());

vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, state: "idle" }),
}));

import { AddPensionAccountDialog } from "./AddPensionAccountDialog";

const DIRECT = "Regular payment each month (optional)";

describe("AddPensionAccountDialog", () => {
  beforeEach(() => mockSubmit.mockClear());

  it("renders the form fields when open and no default trigger", () => {
    render(<AddPensionAccountDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Add a pension pot" })).toBeDefined();
    expect(screen.getByLabelText(/Pot or provider name/)).toBeDefined();
    expect(screen.getByLabelText("Current value")).toBeDefined();
    expect(screen.getByLabelText("Expected return a year")).toBeDefined();
    expect(screen.getByLabelText(DIRECT)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Add pension pot$/i })).toBeNull();
  });

  it("renders a supplied trigger button and nothing when none is given", () => {
    const { rerender } = render(<AddPensionAccountDialog isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <AddPensionAccountDialog
        isOpen={false}
        triggerButton={<button type="button">Open it</button>}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Open it" })).toBeDefined();
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
        accountToEdit={existingPot as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Edit pension pot" })).toBeDefined();
    expect((screen.getByLabelText(/Pot or provider name/) as HTMLInputElement).value).toBe(
      "Vanguard SIPP",
    );
    expect((screen.getByLabelText("Current value") as HTMLInputElement).value).toBe("15,000");
    expect((screen.getByLabelText(DIRECT) as HTMLInputElement).value).toBe("200");
  });

  it("disables the regular payment when Past pot is selected", () => {
    render(<AddPensionAccountDialog isOpen={true} onClose={vi.fn()} />);
    const direct = screen.getByLabelText(DIRECT) as HTMLInputElement;
    expect(direct.disabled).toBe(false);
    fireEvent.click(screen.getByRole("radio", { name: /Past pot/i }));
    expect(direct.disabled).toBe(true);
    expect(direct.value).toBe("");
  });

  it("populates a past pot with the regular payment disabled", () => {
    const pastPot = {
      id: "pot-past",
      name: "Old Employer Pension",
      balance: 12000,
      interestRate: 4.5,
      monthlyContribution: null,
      isCurrent: false,
      type: "Pension",
    };
    render(
      <AddPensionAccountDialog accountToEdit={pastPot as never} isOpen={true} onClose={vi.fn()} />,
    );
    const direct = screen.getByLabelText(DIRECT) as HTMLInputElement;
    expect(direct.disabled).toBe(true);
    expect(direct.value).toBe("");
  });

  it("keeps Add pot disabled until named, then submits the create intent", () => {
    const onClose = vi.fn();
    render(<AddPensionAccountDialog isOpen={true} onClose={onClose} />);
    const add = screen.getByRole("button", { name: "Add pot" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Pot or provider name/), { target: { value: "Nest" } });
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "createPensionAccount",
        name: "Nest",
        balance: "0",
        interestRate: "5",
        isCurrent: "true",
      }),
      { method: "POST", action: "/app/pension" },
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("submits an update for an existing pot", () => {
    render(
      <AddPensionAccountDialog
        accountToEdit={{ id: "p9", name: "Aviva", balance: 100, interestRate: 4 } as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "updatePensionAccount", accountId: "p9", name: "Aviva" }),
      { method: "POST", action: "/app/pension" },
    );
  });
});
