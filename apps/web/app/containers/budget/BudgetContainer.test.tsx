import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-router", () => ({
  useLoaderData: () => ({
    accounts: [],
    accountDetails: [],
    budgetEntries: [],
    userProfile: null,
  }),
  useNavigate: () => vi.fn(),
}));

vi.mock("~/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ setProfile: vi.fn(), markChecklistStep: vi.fn() }),
  DEFAULT_PROFILE: {},
}));

vi.mock("~/utils/utils", () => ({
  currentMonth: 6,
  currentYear: 2026,
}));

import BudgetContainer from "./BudgetContainer";

describe("BudgetContainer", () => {
  it("renders the Budget Planner heading", () => {
    render(<BudgetContainer />);
    expect(screen.getByText("Budget Planner")).toBeDefined();
  });
});
