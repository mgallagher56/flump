import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import HomeHero from "./HomeHero";

vi.mock("react-router", () => ({
  Link: ({ children, to, style }: { children: ReactNode; to: string; style?: any }) => (
    <a href={to} style={style}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}));

describe("HomeHero", () => {
  it("renders the hero heading, CTA buttons, and trust bar badges", () => {
    render(<HomeHero />);

    expect(screen.getByText(/Built for UK personal finance and HMRC rules/i)).toBeDefined();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Your complete UK financial picture in 60 seconds\./i,
      }),
    ).toBeDefined();
    expect(screen.getByText(/Enter 6 rough numbers to calculate your net worth/i)).toBeDefined();

    expect(screen.getByTestId("web-baseline-snapshot-preview")).toBeDefined();
    expect(screen.getByRole("link", { name: /Get your free baseline/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Sign in/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Try the live demo/i })).toBeDefined();
    const livePreviewLink = screen.getByRole("link", { name: /See live preview in app/i });
    expect(livePreviewLink).toBeDefined();
    expect(livePreviewLink.getAttribute("href")).toBe("/sandbox");

    expect(screen.getByText(/FCA read-only Open Banking and 256-bit encryption/i)).toBeDefined();
    expect(screen.getByText(/Section 24 landlord and HMRC tax bands/i)).toBeDefined();
    expect(screen.getByText(/£20k ISA and £60k pension allowances/i)).toBeDefined();
    expect(screen.getByText(/No ad tracking or data selling/i)).toBeDefined();
  });
});
