import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MISSING_GROSS_ERROR, MISSING_REGION_ERROR } from "../IncomeStep";
import { OnboardingFlow } from "./OnboardingFlow";
import { onboardingFlowRecipe } from "./OnboardingFlow.styles";

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

const stepButton = (name: RegExp) =>
  within(screen.getByRole("list", { name: /setup progress/i })).getByRole("button", { name });
const progressItems = () =>
  within(screen.getByRole("list", { name: /setup progress/i })).getAllByRole("listitem");

describe("<OnboardingFlow />", () => {
  beforeEach(() => {
    seedState.showBanner = false;
    seedState.dismissBanner.mockReset();
  });

  it("subtracts the app shell's top padding and bottom-bar offset from its md min height, so it never scrolls", () => {
    const page = onboardingFlowRecipe().page;
    const mdMinHeight = page.split(" ").find((c) => c.startsWith("md:min-h_")) ?? "";
    expect(mdMinHeight).toContain("app-header-offset");
    expect(mdMinHeight).toContain("spacing.6");
    expect(mdMinHeight).toContain("app-bottom-bar-offset");
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
    expect(current()).toContain("Income");
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect(current()).toContain("Housing");
    expect(progressItems()[0]?.getAttribute("data-state")).toBe("complete");
  });

  it("jumps to a step from the stepper itself", () => {
    render(<OnboardingFlow />);
    const list = screen.getByRole("list", { name: /setup progress/i });
    fireEvent.click(within(list).getByRole("button", { name: /Step 3 of 4: Savings/ }));
    expect(list.querySelector("[aria-current='step']")?.textContent).toContain("Savings");
  });

  it("uses one-word stepper names and has no second row of step links", () => {
    render(<OnboardingFlow />);
    const labels = Array.from(
      screen.getByRole("list", { name: /setup progress/i }).querySelectorAll("[data-step-label]"),
    ).map((el) => el.textContent?.replace(/^Step \d of \d: /, ""));
    expect(labels).toEqual(["Income", "Housing", "Savings", "Review"]);
    expect(screen.queryByRole("navigation", { name: /go to a step/i })).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("never labels a skipped or unvisited step complete", () => {
    render(<OnboardingFlow />);
    fireEvent.click(stepButton(/Step 2 of 4: Housing/));
    expect(progressItems()[0]?.getAttribute("data-state")).toBe("skipped");
    fireEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    expect(progressItems()[1]?.getAttribute("data-state")).toBe("skipped");
    // Jump past savings without visiting it.
    fireEvent.click(stepButton(/Step 4 of 4: Review/));
    expect(progressItems()[2]?.getAttribute("data-state")).toBe("skipped");
    expect(
      within(screen.getByRole("list", { name: /setup progress/i })).queryByText("Complete"),
    ).toBeNull();
  });

  it("says Skipped on the review for a skipped step with nothing entered", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    fireEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    const review = screen.getByTestId("onboarding-finish-summary");
    expect(within(review).getAllByText("Skipped")).toHaveLength(2);
    expect(within(review).queryByText("Nothing added yet.")).toBeNull();
  });

  it("keeps entered values when a step is skipped", () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    fireEvent.click(screen.getByRole("radio", { name: /renting/i }));
    fireEvent.change(screen.getByLabelText(/monthly rent/i), { target: { value: "900" } });
    fireEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    fireEvent.click(stepButton(/Step 2 of 4: Housing/));
    expect((screen.getByLabelText(/monthly rent/i) as HTMLInputElement).value).toBe("900");
  });

  it("hides the live summary on the review step so figures appear once", () => {
    render(<OnboardingFlow />);
    expect(screen.getByTestId("onboarding-take-home")).toBeDefined();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect(screen.queryByTestId("onboarding-take-home")).toBeNull();
  });

  it("marks the missing fields when the review sends the user back", () => {
    render(<OnboardingFlow />);
    fireEvent.click(stepButton(/Step 4 of 4: Review/));
    fireEvent.click(screen.getByRole("button", { name: /^Edit you and income$/ }));
    expect(screen.getByText(MISSING_GROSS_ERROR)).toBeDefined();
    expect(
      screen.getByText(MISSING_REGION_ERROR, { ignore: "script, style, option" }),
    ).toBeDefined();
    expect(
      screen
        .getByRole("textbox", { name: /^yearly salary before tax/i })
        .getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("does not mark missing fields on an ordinary visit to the first step", () => {
    render(<OnboardingFlow />);
    fireEvent.click(stepButton(/Step 4 of 4: Review/));
    fireEvent.click(screen.getByRole("button", { name: "Edit You and income" }));
    expect(screen.queryByText(MISSING_GROSS_ERROR)).toBeNull();
  });

  it("focuses the current step heading after Review figures", () => {
    seedState.showBanner = true;
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: /review figures/i }));
    expect(seedState.dismissBanner).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("onboarding-step-income-title");
  });
});
