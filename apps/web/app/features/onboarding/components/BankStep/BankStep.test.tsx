import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankStep } from "./BankStep";

describe("<BankStep />", () => {
  it("is optional, offers Skip for now as the way on and never fakes a connection", () => {
    const onSkip = vi.fn();
    const { container } = render(<BankStep onBack={vi.fn()} onSkip={onSkip} />);
    expect(screen.getByText("Optional")).toBeDefined();
    expect(screen.getByText("No bank connected")).toBeDefined();
    expect(screen.queryByRole("button", { name: /^next/i })).toBeNull();
    expect(container.textContent).not.toMatch(/connected successfully|linked/i);
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it("goes back", () => {
    const onBack = vi.fn();
    render(<BankStep onBack={onBack} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
