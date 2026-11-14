import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankStep } from "./BankStep";

describe("<BankStep />", () => {
  it("is optional, offers Next as the one way on and never fakes a connection", () => {
    const onNext = vi.fn();
    const { container } = render(<BankStep onBack={vi.fn()} onNext={onNext} />);
    expect(screen.getByText("Optional")).toBeDefined();
    expect(screen.getByText("No bank connected")).toBeDefined();
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
    expect(container.textContent).not.toMatch(/connected successfully|linked/i);
    fireEvent.click(screen.getByRole("button", { name: /^next/i }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("goes back", () => {
    const onBack = vi.fn();
    render(<BankStep onBack={onBack} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
