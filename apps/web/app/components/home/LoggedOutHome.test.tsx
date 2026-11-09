import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import LoggedOutHome from "./LoggedOutHome";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({
    children,
    to,
    style,
    className,
  }: {
    children: ReactNode;
    to: string;
    style?: any;
    className?: string;
  }) => (
    <a className={className} href={to} style={style}>
      {children}
    </a>
  ),
}));

describe("LoggedOutHome", () => {
  it("renders all primary sections of the logged out homepage", () => {
    render(<LoggedOutHome />);

    // 1. Hero section
    expect(screen.getByRole("heading", { level: 1, name: /get out of the red/i })).toBeDefined();
    expect(screen.getByText(/built specifically for uk personal finance/i)).toBeDefined();
    const heroCta = screen.getByRole("link", { name: /get your 60-second baseline free/i });
    expect(heroCta.getAttribute("href")).toBe("/signUp");

    // Clean Baseline Preview
    expect(screen.getByTestId("web-baseline-snapshot-preview")).toBeDefined();

    // 2. How It Works Section
    expect(screen.getByTestId("how-it-works-section")).toBeDefined();
    expect(screen.getByText(/how flump works in 3 simple steps/i)).toBeDefined();

    // 3. Feature Pillars
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /everything you need to master uk wealth & taxation/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /uk tax & self-assessment hub/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /complete net worth aggregation/i }),
    ).toBeDefined();

    // 4. Comparison Matrix
    expect(
      screen.getByRole("heading", { level: 2, name: /engineered for uk reality/i }),
    ).toBeDefined();
    expect(screen.getByText(/section 24 landlord relief restriction/i)).toBeDefined();

    // 5. Security & Privacy
    expect(
      screen.getByRole("heading", { level: 2, name: /bank-grade security\. zero ad tracking\./i }),
    ).toBeDefined();

    // 6. FAQ Accordion
    expect(
      screen.getByRole("heading", { level: 2, name: /everything you need to know about flump/i }),
    ).toBeDefined();

    // Bottom CTA
    expect(
      screen.getByRole("heading", { level: 2, name: /ready to master your wealth and taxes\?/i }),
    ).toBeDefined();
    const bottomCta = screen.getByRole("link", { name: /get started for free/i });
    expect(bottomCta.getAttribute("href")).toBe("/signUp");

    // Footer
    expect(screen.getByText(/financial & legal disclaimer:/i)).toBeDefined();
  });

  it("toggles FAQ accordion questions and answers", () => {
    render(<LoggedOutHome />);

    const firstTrigger = screen.getByRole("button", {
      name: /how accurate are the uk tax calculations\?/i,
    });
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");

    // Click to toggle close
    fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("false");

    // Click to toggle open
    fireEvent.click(firstTrigger);
    expect(firstTrigger.getAttribute("aria-expanded")).toBe("true");
  });
});
