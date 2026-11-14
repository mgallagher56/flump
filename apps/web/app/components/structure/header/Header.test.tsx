import { fireEvent, screen, within } from "@testing-library/react";
import mockUser from "__mocks__/user";

import { vi } from "vitest";
import { AppBottomBar } from "~/components/navigation/AppBottomBar";
import { ResponsiveProvider } from "~/context/ResponsiveContext";
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
  renderHomeLogoLink: () => <div>HomeLogo</div>,
}));

describe("<Header />", () => {
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

  test("renders signed out when the root loader data is missing (root error boundary)", () => {
    mocks.mockUseLoaderData.mockReturnValue(undefined);
    customRender(<Header />);
    expect(screen.getByRole("navigation", { name: "Primary" })).not.toBeNull();
    expect(screen.getByText("UserLogin")).not.toBeNull();
  });

  test("signed-out visitors without a bottom bar open the drawer from the menu button", () => {
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

    test("has exactly one navigation control: the bottom bar, with no header menu button", () => {
      mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
      renderPhoneChrome();
      expect(screen.queryByLabelText("Open navigation menu")).toBeNull();
      const bar = screen.getByRole("navigation", { name: "Main navigation" });
      const buttons = within(bar).getAllByRole("button");
      expect(buttons).toHaveLength(1);
      expect(buttons[0].getAttribute("aria-label")).toBe("More pages");
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
