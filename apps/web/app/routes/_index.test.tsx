import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { default as Index, loader } from "./_index";

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn(),
  useLoaderData: vi.fn(),
  redirect: (url: string) => ({ status: 302, url }),
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

vi.mock("~/utils/utils", () => ({
  getAuthSession: vi.fn().mockResolvedValue({ user: null, accessToken: null }),
}));

vi.mock("~/components/dashboard/HomeDashboard", () => ({
  HomeDashboard: () => <div id="mock-home-dashboard">Mock Dashboard</div>,
}));

vi.mock("~/components/home/LoggedOutHome", () => ({
  default: () => <div id="mock-logged-out-home">Mock Logged Out Home</div>,
}));

import { useLoaderData } from "react-router";

describe("_index route", () => {
  it("returns demo data when ?demo=true is present in the loader request", async () => {
    const request = new Request("http://localhost/?demo=true");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;

    expect(data.isDemo).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe("demo@flump.app");
    expect(data.accountsData).toBeDefined();
    expect(data.accountsData.totalAssets).toBeGreaterThan(0);
    expect(data.budgetData).toBeDefined();
    expect(data.savingsData).toBeDefined();
    expect(data.mortgageData).toBeDefined();
    expect(data.pensionData).toBeDefined();
    expect(data.taxData).toBeDefined();
  });

  it("returns logged-out data when no session and not demo mode", async () => {
    const request = new Request("http://localhost/");
    const data = (await loader({ request, params: {}, context: {} } as any)) as any;

    expect(data).toBeDefined();
    expect(data.user).toBeNull();
    expect(data.isDemo).toBe(false);
  });

  it("renders LoggedOutHome when user is null", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      isDemo: false,
      user: null,
      accountsData: null,
    } as any);

    render(<Index />);
    expect(screen.getByTestId("mock-logged-out-home")).toBeDefined();
  });

  it("renders DemoModeBanner and HomeDashboard when isDemo is true", () => {
    vi.mocked(useLoaderData).mockReturnValue({
      isDemo: true,
      user: { id: "demo-user", email: "demo@flump.app" },
      accountsData: { netWorth: 100000 },
      checklistProps: {},
      forecastData: {},
      mortgageData: {},
      pensionData: {},
      savingsData: {},
      taxData: {},
    } as any);

    render(<Index />);

    expect(screen.getByTestId("demo-mode-banner")).toBeDefined();
    expect(screen.getByTestId("mock-home-dashboard")).toBeDefined();
  });
});
