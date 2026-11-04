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

    // Hero section
    expect(
      screen.getByRole("heading", { level: 1, name: /stop guessing your financial future/i }),
    ).toBeDefined();
    expect(screen.getByText(/built specifically for uk personal finance/i)).toBeDefined();
    const heroCta = screen.getByRole("link", { name: /start free today/i });
    expect(heroCta.getAttribute("href")).toBe("/signUp");

    // Interactive Demo Section
    expect(
      screen.getByRole("heading", { level: 2, name: /test the calculation engines live/i }),
    ).toBeDefined();

    // Feature Pillars
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

    // Comparison Matrix
    expect(
      screen.getByRole("heading", { level: 2, name: /engineered for uk reality/i }),
    ).toBeDefined();
    expect(screen.getByText(/section 24 landlord relief restriction/i)).toBeDefined();

    // Security & Privacy
    expect(
      screen.getByRole("heading", { level: 2, name: /bank-grade security\. zero ad tracking\./i }),
    ).toBeDefined();

    // FAQ Accordion
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

  it("calculates UK tax take-home and displays the £100k taper alert for higher incomes", () => {
    render(<LoggedOutHome />);

    // Default salary is £65,000, so taper alert should not be visible
    expect(screen.queryByText(/personal allowance taper active/i)).toBeNull();

    // Click £115k preset
    const preset115k = screen.getByRole("button", { name: "£115,000" });
    fireEvent.click(preset115k);

    // Taper alert should now be active
    expect(screen.getByText(/personal allowance taper active/i)).toBeDefined();
    expect(screen.getByText(/allowance reduced to £5,070/i)).toBeDefined();
  });

  it("switches to the mortgage calculator tab and simulates overpayment interest savings", () => {
    render(<LoggedOutHome />);

    // Switch to mortgage tab
    const mortgageTab = screen.getByRole("tab", { name: /mortgage overpayment modeler/i });
    fireEvent.click(mortgageTab);

    expect(screen.getByLabelText(/remaining mortgage balance/i)).toBeDefined();
    expect(screen.getByText(/total interest saved/i)).toBeDefined();

    // Change overpayment amount
    const overpaymentInput = screen.getByLabelText(/monthly overpayment/i);
    fireEvent.change(overpaymentInput, { target: { value: "350" } });

    expect(
      screen.getByText(/guaranteed interest eliminated by overpaying £350\/mo/i),
    ).toBeDefined();
  });

  it("toggles FAQ accordion questions and answers", () => {
    render(<LoggedOutHome />);

    const questionBtn = screen.getByRole("button", {
      name: /what is section 24 and why does flump model it\?/i,
    });
    expect(questionBtn.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(questionBtn);
    expect(questionBtn.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(/section 24 restricts residential landlords/i)).toBeDefined();

    // Clicking again collapses it
    fireEvent.click(questionBtn);
    expect(questionBtn.getAttribute("aria-expanded")).toBe("false");
  });
});
