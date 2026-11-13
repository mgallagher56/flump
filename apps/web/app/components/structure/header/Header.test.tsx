import { fireEvent, screen } from "@testing-library/react";
import mockUser from "__mocks__/user";

import { vi } from "vitest";
import customRender from "~/testUtils/customRender";

import Header from "./Header";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
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

vi.mock("app/components/navigation/HomeLogo", () => ({
  default: () => <div>HomeLogo</div>,
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
    const nav = container.querySelector("nav");
    expect(header).not.toBeNull();
    expect(nav).not.toBeNull();
    expect(header?.className).toContain("pos_sticky");
    expect(header?.className).toContain("top_0");
  });

  test("renders mobile variant and opens/closes mobile navigation drawer", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    customRender(<Header isMobile variant="mobile" />);
    const toggleBtn = screen.getByTestId("mobile-menu-toggle");
    expect(toggleBtn).not.toBeNull();

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("mobile-nav-drawer")).not.toBeNull();

    const closeBtn = screen.getByLabelText("Close navigation menu");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("mobile-nav-drawer")).toBeNull();
  });
});
