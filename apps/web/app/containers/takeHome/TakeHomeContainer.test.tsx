import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigate = vi.fn();
vi.mock("react-router", () => ({
  useLoaderData: () => ({ userProfile: { annualSalary: 60000 } }),
  useNavigate: () => navigate,
}));
vi.mock("~/hooks/useUserProfile", () => ({
  useUserProfile: () => ({ profile: { annualSalary: 60000 }, setProfile: vi.fn() }),
}));
vi.mock("~/state/baseline.store", () => ({
  useFinancialBaseline: () => ({ baseline: { annualGrossSalary: 0 } }),
}));
vi.mock("~/features/take-home/components/TakeHomeCalculator", () => ({
  TakeHomeCalculator: ({
    initialSalary,
    onApplyIncrease,
  }: {
    initialSalary: number;
    onApplyIncrease: (n: number) => void;
  }) => (
    <button type="button" onClick={() => onApplyIncrease(123.4)}>
      calc {initialSalary}
    </button>
  ),
}));

import TakeHomeContainer from "./TakeHomeContainer";

describe("<TakeHomeContainer />", () => {
  beforeEach(() => navigate.mockClear());

  it("renders the page heading and seeds the calculator from the profile salary", () => {
    render(<TakeHomeContainer />);
    expect(screen.getByRole("heading", { level: 1, name: "Your take-home pay" })).toBeDefined();
    expect(screen.getByText("calc 60000")).toBeDefined();
  });

  it("describes the page for every earner, not only the £100k band (E31)", () => {
    const { container } = render(<TakeHomeContainer />);
    expect(screen.getByText(/what you keep from your pay/i)).toBeDefined();
    expect(container.textContent).not.toMatch(/100k|tax trap/i);
  });

  it("sends 'model this' to the Savings forecaster with the monthly rise", () => {
    render(<TakeHomeContainer />);
    fireEvent.click(screen.getByText("calc 60000"));
    expect(navigate).toHaveBeenCalledWith("/app/savings#forecast", { state: { payRise: 123 } });
  });
});
