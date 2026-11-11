import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import SandboxRoute, { meta } from "./sandbox";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useLoaderData: vi.fn(),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("~/components/dashboard/HomeDashboard", () => ({
  HomeDashboard: ({ accountsData, debtData }: any) => (
    <div id="mock-dashboard">
      <span id="net-worth" data-testid="net-worth">
        {accountsData?.netWorth}
      </span>
      <span id="total-debt" data-testid="total-debt">
        {debtData?.totalDebt ?? 0}
      </span>
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

  it("renders Persona A by default and switches between Persona B and Persona C", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);

    expect(screen.getByText(/LIVE DEMO SANDBOX \(READ-ONLY\)/i)).toBeDefined();
    expect(screen.getByText("Persona A: Clearing £8k Debt")).toBeDefined();
    expect(screen.getByText("Persona B: £45k Earner (No Debt)")).toBeDefined();
    expect(screen.getByText("Persona C: £100k High Earner")).toBeDefined();

    expect(screen.getByTestId("total-debt").textContent).toBe("8000");

    // Switch to Persona B (£45k earner, no debt)
    fireEvent.click(screen.getByText("Persona B: £45k Earner (No Debt)"));
    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("43300");

    // Switch to Persona C (£100k high earner)
    fireEvent.click(screen.getByText("Persona C: £100k High Earner"));
    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("441500");
  });

  it("boots directly in wealth persona if ?persona=wealth", () => {
    mockSearchParams = new URLSearchParams("persona=wealth");
    render(<SandboxRoute />);

    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("441500");
  });

  it("clicking Save My Custom Numbers commits seed and navigates to /signUp", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);

    const saveBtn = screen.getByText(/Save My Custom Numbers/i);
    fireEvent.click(saveBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/signUp");
  });
});
