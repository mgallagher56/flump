import mockUser from "__mocks__/user";

import { createRoutesStub } from "react-router";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";

import UserLogin from "./UserLogin";

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useRouteLoaderData: mocks.mockUseLoaderData,
    Link: ({ children, to, ...props }: any) => (
      <a {...props} href={to}>
        {children}
      </a>
    ),
  };
});

const UserLoginRoute = () => <UserLogin />;
const Stub = createRoutesStub([{ path: "/", Component: UserLoginRoute }]);

const renderWithRouter = () => customRender(<Stub />);

describe("<UserLogin />", () => {
  test("offers sign up and sign in as links when signed out", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { getByRole } = renderWithRouter();
    expect(getByRole("link", { name: "signUp" }).getAttribute("href")).toBe("/signup");
    expect(getByRole("link", { name: "logIn" }).getAttribute("href")).toBe("/login");
  });

  test("renders the links with the design-system button styles, not the legacy FLP ones", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { getByRole } = renderWithRouter();
    expect(getByRole("link", { name: "signUp" }).getAttribute("data-variant")).toBe("ghost");
  });

  test("treats missing root loader data (root error boundary) as signed out", () => {
    mocks.mockUseLoaderData.mockReturnValue(undefined);
    const { getByRole } = renderWithRouter();
    expect(getByRole("link", { name: "logIn" })).toBeDefined();
  });

  test("renders sign out when logged in", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByText } = renderWithRouter();
    expect(getByText("logOut")).toBeDefined();
  });

  test("logs out through a POST form, not a link", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { getByRole, container } = renderWithRouter();
    const form = container.querySelector("form");
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form?.getAttribute("action")).toBe("/logout");
    expect(getByRole("button", { name: "logOut" }).getAttribute("type")).toBe("submit");
    expect(container.querySelector('a[href="/logout"]')).toBeNull();
  });
});
