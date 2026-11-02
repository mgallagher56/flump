import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

import SetupChecklist from "./SetupChecklist";

describe("SetupChecklist", () => {
  it("renders checklist with pension step", () => {
    render(
      <SetupChecklist
        completedSteps={[]}
        hasAccounts={true}
        hasBudget={false}
        hasMortgageAccount={false}
        hasPension={false}
        hasProfile={false}
        hasRunForecast={false}
        hasSavings={false}
      />,
    );

    expect(screen.getByText("Track pension & retirement")).toBeDefined();
    expect(screen.getByText("Track Pension →")).toBeDefined();
  });

  it("marks pension step as completed when hasPension is true", () => {
    render(
      <SetupChecklist
        completedSteps={[]}
        hasAccounts={true}
        hasBudget={false}
        hasMortgageAccount={false}
        hasPension={true}
        hasProfile={false}
        hasRunForecast={false}
        hasSavings={false}
      />,
    );

    expect(screen.getByText("Track pension & retirement")).toBeDefined();
    // Action button should not be present when completed
    expect(screen.queryByText("Track Pension →")).toBeNull();
  });
});
