import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavingsQuickStartWizard } from "./SavingsQuickStartWizard";

const mockSubmit = vi.fn();

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: mockSubmit,
    state: "idle",
  }),
}));

describe("SavingsQuickStartWizard", () => {
  it("steps through wizard, updates fields, and submits savings account creation", () => {
    const onComplete = vi.fn();
    const onDismiss = vi.fn();

    render(<SavingsQuickStartWizard onComplete={onComplete} onDismiss={onDismiss} />);

    // Step 1
    fireEvent.change(screen.getByLabelText("Account Name"), {
      target: { value: "Marcus Rainy Day" },
    });
    fireEvent.change(screen.getByLabelText(/Current Balance/i), {
      target: { value: "5000" },
    });
    fireEvent.change(screen.getByLabelText(/Interest rate/i), {
      target: { value: "4.8" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 2
    fireEvent.change(screen.getByLabelText(/How much do you plan to deposit/i), {
      target: { value: "400" },
    });

    // Go back and forward again
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    fireEvent.click(screen.getByRole("button", { name: /Next/i }));

    // Step 3
    expect(screen.getByText("5-Year Projection")).toBeTruthy();
    expect(screen.getByText("10-Year Projection")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Complete & Save/i }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "createSavingsAccount",
        name: "Marcus Rainy Day",
        balance: "5000",
        interestRate: "4.8",
        monthlyContribution: "400",
      }),
      { method: "POST", action: "/app/savings" },
    );
    expect(onComplete).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Skip setup/i }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
