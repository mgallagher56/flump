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

vi.mock("~/features/dashboard/components/HomeDashboard", () => ({
  HomeDashboard: ({ accountsData, debtData, persistVisibility }: any) => (
    <div id="mock-dashboard" data-persist-visibility={String(persistVisibility)}>
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

  it("labels the persona dashboard figures as sample data", () => {
    render(<SandboxRoute />);
    expect(screen.getByTestId("sandbox-sample-data-label").textContent).toMatch(
      /Sample data: illustrative figures, not yours/,
    );
  });

  it("does not render its own projection notice (HomeDashboard owns the single one)", () => {
    render(<SandboxRoute />);
    expect(document.querySelector('[data-testid="projection-notice"]')).toBeNull();
  });

  it("never persists dashboard show or hide choices for sandbox users", () => {
    mockSearchParams = new URLSearchParams();
    const { container } = render(<SandboxRoute />);
    expect(
      container.querySelector("#mock-dashboard")?.getAttribute("data-persist-visibility"),
    ).toBe("false");
  });

  it("renders Persona A by default and switches between Persona B and Persona C", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);

    expect(screen.getByText(/Demo sandbox \(read-only\)/i)).toBeDefined();
    expect(screen.getByText("Clearing £8k debt")).toBeDefined();
    expect(screen.getByText("£45k earner, no debt")).toBeDefined();
    expect(screen.getByText("£100k high earner")).toBeDefined();

    expect(screen.getByTestId("total-debt").textContent).toBe("8000");
    expect(screen.getByText("Clearing £8k debt").getAttribute("aria-pressed")).toBe("true");

    // Switch to Persona B (£45k earner, no debt)
    fireEvent.click(screen.getByText("£45k earner, no debt"));
    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("43300");

    // Switch to Persona C (£100k high earner)
    fireEvent.click(screen.getByText("£100k high earner"));
    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("441500");
  });

  it("boots directly in wealth persona if ?persona=wealth", () => {
    mockSearchParams = new URLSearchParams("persona=wealth");
    render(<SandboxRoute />);

    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("441500");
  });

  it("clicking Save my numbers commits seed and navigates to /signup", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);

    const saveBtn = screen.getByRole("button", { name: /Save my numbers and create account/i });
    fireEvent.click(saveBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });

  it("save seed carries modules and stage but no salary", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);
    fireEvent.click(screen.getByRole("button", { name: /Save my numbers and create account/i }));
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
