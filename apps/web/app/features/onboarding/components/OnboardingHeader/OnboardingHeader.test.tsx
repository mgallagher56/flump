import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OnboardingHeader } from "./OnboardingHeader";

vi.mock("~/components/navigation/HomeLogo", () => ({ default: () => <a href="/">Flump home</a> }));

describe("<OnboardingHeader />", () => {
  it("has one level-1 heading and makes no time claim", () => {
    const { container } = render(<OnboardingHeader />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(container.textContent).not.toMatch(/\d+\s*seconds/i);
  });
});
