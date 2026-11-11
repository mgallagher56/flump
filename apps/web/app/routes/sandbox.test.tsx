import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { getAuthSession } from "~/utils/auth.server";
import SandboxRoute, { loader, meta } from "./sandbox";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [mockSearchParams, vi.fn()],
  useLoaderData: vi.fn(),
  redirect: (url: string) => ({ status: 302, url }),
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("~/utils/auth.server", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ user: null, accessToken: null }),
}));

const persistSeed = vi.fn();
vi.mock("@flump/finance-engine", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@flump/finance-engine")>()),
  persistOnboardingSeed: (seed: unknown) => persistSeed(seed),
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

  it("clicking Save my numbers commits seed and navigates to /signUp", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);

    const saveBtn = screen.getByText(/Save my numbers and create account/i);
    fireEvent.click(saveBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/signUp");
  });

  it("save seed carries modules and stage but no salary", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);
    fireEvent.click(screen.getByText(/Save my numbers and create account/i));
    const seed = persistSeed.mock.calls.at(-1)?.[0];
    expect(seed.inferredModules.length).toBeGreaterThan(0);
    expect(seed.inferredStage).toBeDefined();
    expect(seed).not.toHaveProperty("annualGrossSalary");
  });

  describe("loader", () => {
    const run = () => loader({ request: new Request("http://localhost/sandbox") } as any);

    it("redirects a signed-in user to /", async () => {
      vi.mocked(getAuthSession).mockResolvedValueOnce({
        user: { id: "u1" },
        accessToken: "t",
      } as any);
      expect(((await run()) as any).url).toBe("/");
    });

    it("returns an empty object when signed out", async () => {
      expect(await run()).toEqual({});
    });

    it("treats a non-Response auth error as signed out", async () => {
      vi.mocked(getAuthSession).mockRejectedValueOnce(new Error("boom"));
      expect(await run()).toEqual({});
    });

    it("rethrows a Response from auth", async () => {
      const response = new Response(null, { status: 302 });
      vi.mocked(getAuthSession).mockRejectedValueOnce(response);
      await expect(run()).rejects.toBe(response);
    });
  });
});
