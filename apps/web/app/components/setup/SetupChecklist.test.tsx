import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(mockNavigate).toHaveBeenCalledWith("/app/savings#forecast");

    fireEvent.click(screen.getByRole("button", { name: /Open tax tracker/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/app/tax");

    // Dismiss checklist
    fireEvent.click(screen.getByTitle("Dismiss"));
    expect(window.localStorage.getItem("flump_setup_checklist_dismissed")).toBe("true");
  });

  it("expands and collapses with the keyboard", async () => {
    const user = userEvent.setup();
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
    const toggle = screen.getByRole("button", { name: /refine and drill down/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{Enter}");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps a heading landmark around the toggle without nesting interactive elements", () => {
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
    const heading = screen.getByRole("heading", { name: /refine and drill down/i });
    const toggle = screen.getByRole("button", { name: /refine and drill down/i });
    expect(heading.contains(toggle)).toBe(true);
    expect(toggle.querySelector("button, a, input")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Dismiss setup checklist" }).closest("h4"),
    ).toBeNull();
  });

  describe("forecast step follows the Savings module", () => {
    const base = {
      completedSteps: [] as string[],
      hasAccounts: false,
      hasBudget: false,
      hasMortgageAccount: false,
      hasProfile: false,
      hasRunForecast: false,
      variant: "mobile" as const,
    };
    const expand = () => fireEvent.click(screen.getByText(/Refine and drill down your baseline/i));

    it("shows the step when savings is enabled", () => {
      render(<SetupChecklist {...base} enabledPages={["accounts", "savings"]} />);
      expand();
      expect(screen.getByRole("button", { name: /Model scenarios/i })).toBeDefined();
    });

    it("hides the step when savings is not enabled", () => {
      render(<SetupChecklist {...base} enabledPages={["accounts", "budget"]} />);
      expand();
      expect(screen.queryByRole("button", { name: /Model scenarios/i })).toBeNull();
    });

    it("ignores a stray forecast key in enabledPages", () => {
      render(<SetupChecklist {...base} enabledPages={["accounts", "forecast"]} />);
      expand();
      expect(screen.queryByRole("button", { name: /Model scenarios/i })).toBeNull();
    });
  });
});
