import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeedBanner } from "./SeedBanner";

const base = {
  hasNumbers: true,
  canFinish: true,
  missingForFinish: null,
  isSubmitting: false,
  onLaunch: vi.fn(),
  onReview: vi.fn(),
};

describe("<SeedBanner />", () => {
  it("names the carried salary in en-GB and launches", () => {
    const onLaunch = vi.fn();
    render(<SeedBanner {...base} onLaunch={onLaunch} salary={75000} />);
    expect(screen.getByTestId("seed-salary").textContent).toBe("£75,000");
    expect(screen.getByTestId("seed-banner").textContent).toContain(
      "We've pre-loaded your £75,000 salary and savings from the calculator.",
    );
    fireEvent.click(screen.getByRole("button", { name: /finish with these numbers/i }));
    expect(onLaunch).toHaveBeenCalled();
  });

  it("explains why launch is disabled", () => {
    render(<SeedBanner {...base} canFinish={false} missingForFinish="Enter your income" />);
    const btn = screen.getByRole("button", {
      name: /finish with these numbers/i,
    }) as HTMLButtonElement;
    const hint = screen.getByTestId("seed-income-hint");
    expect(btn.disabled).toBe(true);
    expect(btn.getAttribute("aria-describedby")).toBe(hint.id);
    expect(hint.getAttribute("role")).toBe("status");
  });

  it("keeps the launch button focusable while saving and ignores clicks", () => {
    const onLaunch = vi.fn();
    render(<SeedBanner {...base} isSubmitting onLaunch={onLaunch} />);
    const btn = screen.getByRole("button", { name: /saving/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(btn);
    expect(onLaunch).not.toHaveBeenCalled();
  });

  it("says demo choices are remembered when there are no numbers", () => {
    render(
      <SeedBanner
        {...base}
        canFinish={false}
        hasNumbers={false}
        missingForFinish="Enter your income"
      />,
    );
    expect(screen.getByText(/demo choices are remembered/i)).toBeDefined();
  });
});
