import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DisabledNavItem } from "./DisabledNavItem";

describe("<DisabledNavItem />", () => {
  it("is focusable, aria-disabled and described by a visible hint", () => {
    render(<DisabledNavItem id="nav-disabled-debt" label="Debt" />);
    const button = screen.getByRole("button", { name: /Debt/ });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);
    button.focus();
    expect(document.activeElement).toBe(button);
    const hint = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toContain("signUpToOpen");
  });

  it("does nothing on activation", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <DisabledNavItem id="x" label="Debt" />
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
