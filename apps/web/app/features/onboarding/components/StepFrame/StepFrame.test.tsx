import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StepFrame } from "./StepFrame";

describe("<StepFrame />", () => {
  it("renders a named section with Back, Skip for now and Next wired up", () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
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
    expect(screen.queryByRole("button", { name: "Skip for now" })).toBeNull();
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
