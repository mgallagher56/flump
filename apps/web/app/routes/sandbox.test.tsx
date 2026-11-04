import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import SandboxRoute, { meta } from "./sandbox";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLoaderData: vi.fn(),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("~/components/dashboard/HomeDashboard", () => ({
  HomeDashboard: ({ accountsData, debtData }: any) => (
    <div data-testid="mock-dashboard">
      <span data-testid="net-worth">{accountsData?.netWorth}</span>
      <span data-testid="total-debt">{debtData?.totalDebt}</span>
    </div>
  ),
}));

describe("SandboxRoute", () => {
  it("has robots noindex meta tag", () => {
    const metaTags = meta({} as any);
    expect(metaTags).toEqual([
      { title: "Live Demo Sandbox | Flump (Read-Only)" },
      { name: "robots", content: "noindex, nofollow" },
    ]);
  });

  it("renders Persona A by default and switches to Persona B", () => {
    render(<SandboxRoute />);

    expect(screen.getByText(/LIVE DEMO SANDBOX \(READ-ONLY\)/i)).toBeDefined();
    expect(screen.getByText("Persona A: Clearing £8k Debt")).toBeDefined();
    expect(screen.getByText("Persona B: £95k Earner + BTL")).toBeDefined();

    // Switch to Persona B
    fireEvent.click(screen.getByText("Persona B: £95k Earner + BTL"));
    expect(screen.getByText("Persona B: £95k Earner + BTL")).toBeDefined();
  });

  it("clicking Save My Changes commits seed and navigates to /signUp", () => {
    render(<SandboxRoute />);

    const saveBtn = screen.getByText(/Save My Changes & Create Account/i);
    fireEvent.click(saveBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/signUp");
  });
});
