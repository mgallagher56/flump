import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import customRender from "~/testUtils/customRender";
import NavMenu, { type NavRouteItem } from "./NavMenu";

const mocks = vi.hoisted(() => ({
  pathname: "/app/pension",
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLocation: () => ({ pathname: mocks.pathname }),
    NavLink: ({ children, to, className, onClick }: any) => {
      const resolvedClass =
        typeof className === "function"
          ? className({ isActive: mocks.pathname === to })
          : className;
      return (
        <a className={resolvedClass} href={to} onClick={onClick}>
          {children}
        </a>
      );
    },
  };
});

describe("<NavMenu />", () => {
  const groupedRoutes: NavRouteItem[] = [
    { key: "budget", route: "/app/budget" },
    {
      key: "wealth",
      children: [
        {
          key: "savings",
          route: "/app/savings",
          description: "High-yield accounts",
        },
        {
          key: "pension",
          route: "/app/pension",
          description: "Workplace pots",
        },
      ],
    },
    {
      key: "planning",
      children: [
        {
          key: "forecast",
          route: "/app/forecast",
          description: "Multi-year cashflow",
        },
      ],
    },
  ];

  it("renders direct links and grouped dropdown triggers on desktop", () => {
    customRender(<NavMenu routes={groupedRoutes} />);

    expect(screen.getByText("budget")).toBeDefined();
    const wealthTrigger = screen.getByTestId("nav-dropdown-trigger-wealth");
    const planningTrigger = screen.getByTestId("nav-dropdown-trigger-planning");
    expect(wealthTrigger).toBeDefined();
    expect(planningTrigger).toBeDefined();
    expect(wealthTrigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens grouped flyout on click, displays child descriptions, and closes on Escape", () => {
    customRender(<NavMenu routes={groupedRoutes} />);

    const wealthTrigger = screen.getByTestId("nav-dropdown-trigger-wealth");
    fireEvent.click(wealthTrigger);

    expect(wealthTrigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("nav-dropdown-panel-wealth")).toBeDefined();
    expect(screen.getByText("savings")).toBeDefined();
    expect(screen.getByText("High-yield accounts")).toBeDefined();
    expect(screen.getByText("pension")).toBeDefined();
    expect(screen.getByText("Workplace pots")).toBeDefined();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("nav-dropdown-panel-wealth")).toBeNull();
  });

  it("renders grouped section headings in mobile variant", () => {
    customRender(<NavMenu isMobile routes={groupedRoutes} variant="mobile" />);

    expect(screen.getByTestId("nav-menu-mobile")).toBeDefined();
    expect(screen.getByText("wealth")).toBeDefined();
    expect(screen.getByText("savings")).toBeDefined();
    expect(screen.getByText("pension")).toBeDefined();
  });

  it("renders the label key instead of the module key when a route sets one", () => {
    customRender(
      <NavMenu routes={[{ key: "tax", label: "selfAssessment", route: "/app/self-assessment" }]} />,
    );
    expect(screen.getByText("selfAssessment")).toBeDefined();
    expect(screen.queryByText("tax")).toBeNull();
  });
});
