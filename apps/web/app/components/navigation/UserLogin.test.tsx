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
    useLoaderData: mocks.mockUseLoaderData,
  };
});

vi.mock("app/components/core/buttons/FLPLinkButton", () => ({
  default: (props: any) => <div>{props.text}</div>,
}));

const UserLoginRoute = () => <UserLogin />;
const Stub = createRoutesStub([{ path: "/", Component: UserLoginRoute }]);

const renderWithRouter = () => customRender(<Stub />);

describe("<UserLogin />", () => {
  test("renders as expected when user not logged in", () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: undefined });
    const { baseElement } = renderWithRouter();
    expect(baseElement).toMatchSnapshot();
  });
  test("renders signed out when logged in", () => {
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
