import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SETUP_CHECKLIST_DISMISSED_KEY, SetupChecklist } from "./SetupChecklist";

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
      screen.getByRole("button", { name: "Dismiss setup checklist" }).closest("h2"),
    ).toBeNull();
  });

  describe("dismissal", () => {
    const props = {
      completedSteps: [] as string[],
      hasAccounts: false,
      hasBudget: false,
      hasMortgageAccount: false,
      hasProfile: false,
      hasRunForecast: false,
      variant: "mobile" as const,
    };

    it("stays hidden for a browser that already dismissed it", () => {
      window.localStorage.setItem(SETUP_CHECKLIST_DISMISSED_KEY, "true");
      const { container } = render(<SetupChecklist {...props} />);
      expect(container.firstChild).toBeNull();
    });

    it("hides immediately and remembers the dismissal", () => {
      render(<SetupChecklist {...props} />);
      fireEvent.click(screen.getByRole("button", { name: "Dismiss setup checklist" }));
      expect(screen.queryByRole("heading", { name: /refine and drill down/i })).toBeNull();
      expect(window.localStorage.getItem(SETUP_CHECKLIST_DISMISSED_KEY)).toBe("true");
    });

    it("still works when storage is blocked", () => {
      const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      try {
        render(<SetupChecklist {...props} />);
        expect(screen.getByRole("heading", { name: /refine and drill down/i })).toBeDefined();
        fireEvent.click(screen.getByRole("button", { name: "Dismiss setup checklist" }));
        expect(screen.queryByRole("heading", { name: /refine and drill down/i })).toBeNull();
      } finally {
        getItem.mockRestore();
        setItem.mockRestore();
      }
    });
  });

  describe("progress", () => {
    const base = {
      hasAccounts: false,
      hasBudget: false,
      hasMortgageAccount: false,
      hasProfile: false,
      hasRunForecast: false,
      variant: "mobile" as const,
    };

    it("announces the count through a status region and exposes a progress bar", () => {
      render(<SetupChecklist {...base} completedSteps={["budget", "accounts"]} />);
      expect(screen.getByRole("status").textContent).toBe("2 of 7 steps complete");
      expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("2");
    });

    it("renders nothing once every step is complete", () => {
      const { container } = render(
        <SetupChecklist
          {...base}
          completedSteps={[
            "budget",
            "accounts",
            "savings",
            "pension",
            "mortgage",
            "forecast",
            "tax",
          ]}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
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
