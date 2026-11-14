import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepFrame } from "./StepFrame";

describe("<StepFrame />", () => {
  it("renders a named section with Back, Skip this step and Next wired up", () => {
    const onBack = vi.fn();
    const onSkip = vi.fn();
    const onNext = vi.fn();
    render(
      <StepFrame id="x" onBack={onBack} onNext={onNext} onSkip={onSkip} title="A step">
        <p>Fields</p>
      </StepFrame>,
    );
    expect(screen.getByRole("region", { name: "A step" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Skip this step" }));
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect([onBack, onSkip, onNext].every((fn) => fn.mock.calls.length === 1)).toBe(true);
  });

  it("omits Back and Skip when not given", () => {
    render(
      <StepFrame id="x" title="A step">
        content
      </StepFrame>,
    );
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Skip this step" })).toBeNull();
  });

  it("draws Skip this step as a text link on its own row, not beside Next", () => {
    render(
      <StepFrame id="x" onNext={() => {}} onSkip={() => {}} title="A step">
        content
      </StepFrame>,
    );
    const skip = screen.getByRole("button", { name: "Skip this step" });
    const next = screen.getByRole("button", { name: /^next/i });
    expect(skip.parentElement).not.toBe(next.parentElement);
  });

  it("moves focus to the heading when asked", () => {
    render(
      <StepFrame focusOnMount id="x" title="A step">
        content
      </StepFrame>,
    );
    expect(document.activeElement?.textContent).toBe("A step");
  });
});
