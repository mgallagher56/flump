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
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /your complete uk financial picture in 60 seconds/i,
      }),
    ).toBeDefined();
    expect(screen.getByText(/^\s*built for uk personal finance$/i)).toBeDefined();
    const heroCta = screen.getByRole("link", { name: /get your free baseline/i });
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
        name: /everything you need to master uk wealth and taxation/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /uk tax and self assessment hub/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 3, name: /complete net worth aggregation/i }),
    ).toBeDefined();

    // 4. Comparison Matrix
    expect(screen.getByRole("heading", { level: 2, name: /built for uk rules/i })).toBeDefined();
    expect(screen.getByText(/section 24 buy-to-let finance cost disallowance/i)).toBeDefined();

    // 5. Security & Privacy
    expect(
      screen.getByRole("heading", { level: 2, name: /^security and privacy$/i }),
    ).toBeDefined();

    // 6. FAQ Accordion
    expect(
      screen.getByRole("heading", { level: 2, name: /frequently asked questions/i }),
    ).toBeDefined();

    // Bottom CTA
    expect(
      screen.getByRole("heading", { level: 2, name: /your financial baseline in 60 seconds/i }),
    ).toBeDefined();
    const bottomCta = screen.getByRole("link", { name: /get started free/i });
    expect(bottomCta.getAttribute("href")).toBe("/signUp");

    // Footer
    expect(screen.queryByText(/^disclaimer:/i)).toBeNull();
    expect(screen.queryByText(/Financial Conduct Authority/i)).toBeNull();
  });

  it("toggles FAQ accordion questions and answers", () => {
    render(<LoggedOutHome />);

    const firstTrigger = screen.getByRole("button", {
      name: /can flump move my money or make payments\?/i,
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
