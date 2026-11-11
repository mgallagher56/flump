import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SetupChecklist from "./SetupChecklist";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("SetupChecklist", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockNavigate.mockReset();
  });

  it("expands checklist, triggers step navigation actions, and dismisses", () => {
    render(
      <SetupChecklist
        completedSteps={["budget"]}
        hasAccounts={false}
        hasBudget={true}
        hasMortgageAccount={false}
        hasProfile={true}
        hasRunForecast={false}
        variant="mobile"
      />,
    );

    // Expand checklist
    fireEvent.click(screen.getByText(/Refine and drill down your baseline/i));

    // Click each incomplete step button
    fireEvent.click(screen.getByRole("button", { name: /Add account detail/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/accounts");

    fireEvent.click(screen.getByRole("button", { name: /Track savings/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/savings");

    fireEvent.click(screen.getByRole("button", { name: /Refine pension/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/pension");

    fireEvent.click(screen.getByRole("button", { name: /Drill down mortgage/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/mortgage");

    fireEvent.click(screen.getByRole("button", { name: /Model scenarios/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/forecast");

    fireEvent.click(screen.getByRole("button", { name: /Open tax tracker/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/tax");

    // Dismiss checklist
    fireEvent.click(screen.getByTitle("Dismiss"));
    expect(window.localStorage.getItem("flump_setup_checklist_dismissed")).toBe("true");
  });
});
