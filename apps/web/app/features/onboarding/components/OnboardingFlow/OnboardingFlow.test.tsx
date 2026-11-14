import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MISSING_GROSS_ERROR, MISSING_REGION_ERROR } from "../IncomeStep";
import { OnboardingFlow } from "./OnboardingFlow";

const seedState = vi.hoisted(() => ({ showBanner: false, dismissBanner: vi.fn() }));

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("~/hooks/useUserProfile", () => ({ useUserProfile: () => ({ updateProfile: vi.fn() }) }));
vi.mock("../../useSeedHydration", () => ({
  useSeedHydration: () => ({
    seed: seedState.showBanner ? { annualIncome: 50000, timestamp: Date.now() } : null,
    showBanner: seedState.showBanner,
    dismissBanner: seedState.dismissBanner,
    seedHasNumbers: seedState.showBanner,
  }),
}));

const progressItems = () =>
  within(screen.getByRole("list", { name: /setup progress/i })).getAllByRole("listitem");

describe("<OnboardingFlow />", () => {
  beforeEach(() => {
    seedState.showBanner = false;
    seedState.dismissBanner.mockReset();
  });

  it("shows the action error in one alert", () => {
    render(<OnboardingFlow actionError="Something failed" />);
    expect(screen.getByRole("alert").textContent).toContain("Something failed");
  });

  it("marks the current step in the stepper and moves it on Next", () => {
    render(<OnboardingFlow />);
    const current = () =>
      screen.getByRole("list", { name: /setup progress/i }).querySelector("[aria-current='step']")
        ?.textContent ?? "";
    expect(current()).toContain("You and income");
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect(current()).toContain("Housing and outgoings");
    expect(progressItems()[0]?.getAttribute("data-state")).toBe("complete");
  });

  it("jumps to a step from the stepper itself", () => {
    render(<OnboardingFlow />);
    const list = screen.getByRole("list", { name: /setup progress/i });
    fireEvent.click(within(list).getByRole("button", { name: /Step 3 of 5: Savings and debt/ }));
    expect(list.querySelector("[aria-current='step']")?.textContent).toContain("Savings and debt");
  });

  it("never labels a skipped or unvisited step complete", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(progressItems()[0]?.getAttribute("data-state")).toBe("skipped");
    // Jump past savings without visiting it.
    fireEvent.click(screen.getByRole("button", { name: "Bank (optional)" }));
    expect(progressItems()[1]?.getAttribute("data-state")).toBe("skipped");
    expect(progressItems()[2]?.getAttribute("data-state")).toBe("skipped");
    expect(
      within(screen.getByRole("list", { name: /setup progress/i })).queryByText("Complete"),
    ).toBeNull();
  });

  it("keeps entered values when a step is skipped", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "£45,000" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.getByTestId("onboarding-take-home").textContent).not.toBe("Not set");
  });

  it("hides the live summary on the review step so figures appear once", () => {
    render(<OnboardingFlow />);
    expect(screen.getByTestId("onboarding-take-home")).toBeDefined();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(screen.queryByTestId("onboarding-take-home")).toBeNull();
  });

  it("marks the missing fields when the review sends the user back", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: /go to you and income/i }));
    expect(screen.getByText(MISSING_GROSS_ERROR)).toBeDefined();
    expect(screen.getByText(MISSING_REGION_ERROR)).toBeDefined();
    expect(
      screen.getByRole("textbox", { name: /^annual gross salary/i }).getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("does not mark missing fields on an ordinary visit to the first step", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit You and income" }));
    expect(screen.queryByText(MISSING_GROSS_ERROR)).toBeNull();
  });

  it("focuses the current step heading after Review and edit numbers", () => {
    seedState.showBanner = true;
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: /review and edit numbers/i }));
    expect(seedState.dismissBanner).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("onboarding-step-income-title");
  });
});
