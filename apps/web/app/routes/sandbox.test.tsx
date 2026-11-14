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
  HomeDashboard: ({ accountsData, debtData, persistVisibility, banner, footer }: any) => (
    <div id="mock-dashboard" data-persist-visibility={String(persistVisibility)}>
      {banner}
      <span id="net-worth" data-testid="net-worth">
        {accountsData?.netWorth}
      </span>
      <span id="total-debt" data-testid="total-debt">
        {debtData?.totalDebt ?? 0}
      </span>
      {footer}
    </div>
  ),
}));

describe("SandboxRoute", () => {
  it("has robots noindex meta tag", () => {
    const metaTags = meta({} as any);
    expect(metaTags).toEqual([
      { title: "Example figures | Flump" },
      { name: "robots", content: "noindex, nofollow" },
    ]);
  });

  it("says once, in the bar, that the figures are sample data", () => {
    render(<SandboxRoute />);
    expect(screen.getAllByText(/Sample data: illustrative figures, not yours/)).toHaveLength(1);
    expect(screen.queryByTestId("sandbox-sample-data-label")).toBeNull();
  });

  it("has exactly two Sign up buttons: one in the bar and one at the page end", () => {
    render(<SandboxRoute />);
    expect(screen.getAllByRole("button", { name: "Sign up" })).toHaveLength(2);
    expect(
      screen.getByTestId("sandbox-end").contains(screen.getByTestId("sandbox-end-sign-up")),
    ).toBe(true);
    expect(document.body.textContent).not.toMatch(/bank feeds|HMRC|Save my numbers/);
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

  it("defaults to the renting persona and lists personas in order, the higher-income household last", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);

    const labels = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(labels).toEqual([
      "Renting",
      "Paying off debts",
      "Paying a mortgage and letting a property",
    ]);
    expect(screen.getByRole("tab", { name: "Renting" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("43300");

    fireEvent.mouseDown(screen.getByRole("tab", { name: "Paying off debts" }), { button: 0 });
    expect(screen.getByTestId("total-debt").textContent).toBe("8000");

    fireEvent.mouseDown(
      screen.getByRole("tab", { name: "Paying a mortgage and letting a property" }),
      { button: 0 },
    );
    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("441500");
  });

  it("persona names follow the no-shaming rules (no income bands, no judgement)", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);
    const text = screen.getByRole("tablist").textContent ?? "";
    expect(text).not.toMatch(/£|100k|high(er)? earner|clearing|struggl|only|just|still/i);
  });

  it("boots in the debt persona if ?persona=debt", () => {
    mockSearchParams = new URLSearchParams("persona=debt");
    render(<SandboxRoute />);
    expect(screen.getByTestId("total-debt").textContent).toBe("8000");
  });

  it("boots directly in wealth persona if ?persona=wealth", () => {
    mockSearchParams = new URLSearchParams("persona=wealth");
    render(<SandboxRoute />);

    expect(screen.getByTestId("total-debt").textContent).toBe("0");
    expect(screen.getByTestId("net-worth").textContent).toBe("441500");
  });

  it("either Sign up button commits the seed and navigates to /signup", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);

    fireEvent.click(screen.getByTestId("sandbox-bar-sign-up"));
    expect(mockNavigate).toHaveBeenCalledWith("/signup");
    mockNavigate.mockClear();
    fireEvent.click(screen.getByTestId("sandbox-end-sign-up"));

    expect(mockNavigate).toHaveBeenCalledWith("/signup");
  });

  it("save seed carries modules and stage but no salary", () => {
    mockSearchParams = new URLSearchParams();
    render(<SandboxRoute />);
    fireEvent.click(screen.getByTestId("sandbox-bar-sign-up"));
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
