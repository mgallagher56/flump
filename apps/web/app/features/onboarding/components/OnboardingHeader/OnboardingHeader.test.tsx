import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingHeader } from "./OnboardingHeader";

vi.mock("~/components/navigation/renderHomeLogoLink", () => ({
  renderHomeLogoLink: () => <a href="/">Flump home</a>,
}));

describe("<OnboardingHeader />", () => {
  it("has one level-1 heading and makes no time claim", () => {
    const { container } = render(<OnboardingHeader />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.textContent).not.toMatch(/\d+\s*seconds/i);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Set up Flump");
  });

  it("offers Save and exit and no app navigation", () => {
    const onSaveAndExit = vi.fn();
    render(<OnboardingHeader onSaveAndExit={onSaveAndExit} />);
    fireEvent.click(screen.getByRole("button", { name: "Save and exit" }));
    expect(onSaveAndExit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
