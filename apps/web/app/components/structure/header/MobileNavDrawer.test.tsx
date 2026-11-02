import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import customRender from "~/testUtils/customRender";
import MobileNavDrawer from "./MobileNavDrawer";

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    Link: ({ children, to, onClick }: any) => (
      <a href={to} onClick={onClick}>
        {children}
      </a>
    ),
    NavLink: ({ children, to, onClick }: any) => (
      <a href={to} onClick={onClick}>
        {children}
      </a>
    ),
  };
});

vi.mock("~/components/navigation/UserLogin", () => ({
  default: () => <div>UserLogin</div>,
}));

vi.mock("~/components/navigation/HomeLogo", () => ({
  default: () => <div>HomeLogo</div>,
}));

describe("<MobileNavDrawer />", () => {
  test("does not render when isOpen is false", () => {
    const { container } = customRender(<MobileNavDrawer isOpen={false} onClose={vi.fn()} />);
    expect(container.querySelector("[data-testid='mobile-nav-drawer']")).toBeNull();
  });

  test("renders drawer and calls onClose when backdrop or close button is clicked", () => {
    const onClose = vi.fn();
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={onClose} />);

    expect(screen.getByTestId("mobile-nav-drawer")).not.toBeNull();
    const closeBtn = screen.getByLabelText("Close navigation menu");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByTestId("mobile-drawer-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
