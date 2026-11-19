import { fireEvent, screen, within } from "@testing-library/react";
import mockUser from "__mocks__/user";

import { beforeEach, vi } from "vitest";
import { AppBottomBar } from "~/components/navigation/AppBottomBar";
import { renderHomeLogoLink } from "~/components/navigation/renderHomeLogoLink";
import { ResponsiveProvider } from "~/context/ResponsiveContext";
import { resetRememberedRootUser } from "~/hooks/useRootUser";
import customRender from "~/testUtils/customRender";

import Header from "./Header";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useRouteLoaderData: mocks.mockUseLoaderData,
    useLocation: () => ({ pathname: "/" }),
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
    // The drawer's sign-out form; a plain form outside a data router.
    Form: ({ children, action, method }: any) => (
      <form action={action} method={method}>
        {children}
      </form>
    ),
  };
});

vi.mock("app/components/ColorModeSwitch", () => ({
  default: () => <div>ColorModeSwitch</div>,
}));

vi.mock("app/components/navigation/AvatarMenu", () => ({
  default: () => <div>AvatarMenu</div>,
}));

vi.mock("app/components/navigation/UserLogin", () => ({
  default: () => <div>UserLogin</div>,
}));

vi.mock("app/components/navigation/NavMenu", () => ({
  default: ({ routes }) => routes.map(({ key }) => <div key={key}>{key}</div>),
}));

vi.mock("app/components/navigation/renderHomeLogoLink", () => ({
  renderHomeLogoLink: vi.fn(() => <div>HomeLogo</div>),
}));

describe("<Header />", () => {
  // The header remembers the last signed-in user in the browser (P17); each test starts fresh.
  beforeEach(() => resetRememberedRootUser());
  test("renders as expected by default", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { baseElement } = customRender(<Header />);
    expect(baseElement).toMatchSnapshot();
  });
  test("renders without ColorModeSwitch", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { baseElement } = customRender(<Header />);
    expect(baseElement).toMatchSnapshot();
  });

  test("renders correctly when user logged in", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement } = customRender(<Header />);
    expect(baseElement).toMatchSnapshot();
  });

  test("primary nav is labelled", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    customRender(<Header />);
    expect(screen.getByRole("navigation", { name: "Primary" })).not.toBeNull();
  });

  test("applies sticky navigation styles", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { container } = customRender(<Header />);
    const header = container.querySelector("header");
    expect(container.querySelector("nav")).not.toBeNull();
    expect(header?.className).toContain("pos_sticky");
    expect(header?.className).toContain("top_0");
  });

  test("signed-in header lists the primary destinations as links", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    customRender(<Header />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const hrefs = Array.from(nav.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/app/accounts");
    expect(hrefs).toContain("/app/budget");
  });

  test("signed in on Home, the logo link carries no current-page mark (P46)", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    vi.mocked(renderHomeLogoLink).mockClear();
    customRender(<Header />);
    const props = vi.mocked(renderHomeLogoLink).mock.calls.map(([p]) => p);
    expect(props.length).toBeGreaterThan(0);
    for (const p of props) expect(p).not.toHaveProperty("aria-current");
  });

  test("renders signed out when the root loader data is missing (root error boundary)", () => {
    mocks.mockUseLoaderData.mockReturnValue(undefined);
    customRender(<Header />);
    expect(screen.getByRole("navigation", { name: "Primary" })).not.toBeNull();
    expect(screen.getByText("UserLogin")).not.toBeNull();
  });

  test("signed-out visitors open the drawer from the menu button", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    customRender(<Header isMobile variant="mobile" />);
    const toggleBtn = screen.getByLabelText("Open navigation menu");
    expect(toggleBtn).not.toBeNull();

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("mobile-nav-drawer")).not.toBeNull();

    const closeBtn = screen.getByLabelText("Close navigation menu");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();
  });

  describe("at 375 (below the nav breakpoint), signed in", () => {
    const renderPhoneChrome = () =>
      customRender(
        <ResponsiveProvider initialIsMobile>
          <Header />
          <AppBottomBar user={mockUser} />
        </ResponsiveProvider>,
      );

    test("the top bar keeps its menu button beside the bottom bar (owner ruling)", () => {
      mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
      renderPhoneChrome();
      expect(screen.getByRole("button", { name: "Open navigation menu" })).not.toBeNull();
      const bar = screen.getByRole("navigation", { name: "Main navigation" });
      const buttons = within(bar).getAllByRole("button");
      expect(buttons).toHaveLength(1);
      expect(buttons[0].getAttribute("aria-label")).toBe("More pages");
    });

    test("the menu button opens the drawer and focus returns to it on close", () => {
      mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
      renderPhoneChrome();
      const menu = screen.getByRole("button", { name: "Open navigation menu" });
      menu.focus();
      fireEvent.click(menu);
      expect(screen.getByTestId("mobile-nav-drawer")).not.toBeNull();
      expect(menu.getAttribute("aria-expanded")).toBe("true");
      fireEvent.click(screen.getByLabelText("Close navigation menu"));
      expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();
      expect(document.activeElement).toBe(menu);
    });

    test("the top bar carries the one-button theme switch", () => {
      mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
      renderPhoneChrome();
      expect(screen.getByTestId("theme-toggle-compact").tagName).toBe("BUTTON");
      expect(screen.getByRole("button", { name: /^Colour theme: / })).not.toBeNull();
    });

    test("the bottom bar's last item, More, opens and closes the drawer", () => {
      mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
      renderPhoneChrome();
      const bar = screen.getByRole("navigation", { name: "Main navigation" });
      const items = within(bar).getAllByRole("listitem");
      const more = within(items[items.length - 1]).getByRole("button", { name: "More pages" });
      expect(more.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(more);
      expect(screen.getByTestId("mobile-nav-drawer")).not.toBeNull();
      expect(more.getAttribute("aria-expanded")).toBe("true");
      expect(more.getAttribute("aria-controls")).toBe("mobile-nav-drawer");

      fireEvent.click(screen.getByLabelText("Close navigation menu"));
      expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();
    });
  });
});
