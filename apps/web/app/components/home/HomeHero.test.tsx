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

    expect(
      screen.getByText(/Built Specifically for UK Personal Finance & HMRC Rules/i),
    ).toBeDefined();
    expect(screen.getByText(/Get out of the red\./i)).toBeDefined();
    expect(screen.getByText(/Build into the black\./i)).toBeDefined();
    expect(
      screen.getByText(/The UK financial engine built for every stage of your money\./i),
    ).toBeDefined();

    expect(screen.getByRole("link", { name: /Start Free Today/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Sign In to Account/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /Explore Live Sandbox/i })).toBeDefined();

    expect(screen.getByText(/FCA Read-Only Open Banking & 256-Bit TLS/i)).toBeDefined();
    expect(screen.getByText(/Section 24 Landlord & 2026\/27 Tax Bands/i)).toBeDefined();
    expect(screen.getByText(/£20k ISA & £60k Pension Allowances/i)).toBeDefined();
    expect(screen.getByText(/Zero Ad Tracking or Data Selling/i)).toBeDefined();
  });
});
