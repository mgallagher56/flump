import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ResponsiveProvider } from "~/context/ResponsiveContext";
import customRender from "~/testUtils/customRender";
import MobileBottomBar from "./MobileBottomBar";

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    NavLink: ({ children, to, className }: any) => (
      <a
        className={typeof className === "function" ? className({ isActive: false }) : className}
        href={to}
      >
        {children}
      </a>
    ),
  };
});

describe("<MobileBottomBar />", () => {
  test("does not render when user is null", () => {
    const { container } = customRender(<MobileBottomBar user={null} />);
    expect(container.querySelector("[data-testid='mobile-bottom-bar']")).toBeNull();
  });

  test("renders bottom bar tabs and triggers onMoreClick when user is logged in", () => {
    const onMoreClick = vi.fn();
    customRender(
      <ResponsiveProvider initialIsMobile={true}>
        <MobileBottomBar isMobile user={{ id: "1" }} onMoreClick={onMoreClick} />
      </ResponsiveProvider>,
    );

    expect(screen.getByTestId("mobile-bottom-bar")).not.toBeNull();
    const moreBtn = screen.getByTestId("mobile-bottom-bar-more");
    fireEvent.click(moreBtn);
    expect(onMoreClick).toHaveBeenCalledTimes(1);
  });
});

describe("<MobileBottomBar /> tabs", () => {
  test("shows Debt and leaves opt-in Tax to the More drawer", () => {
    customRender(
      <ResponsiveProvider initialIsMobile={true}>
        <MobileBottomBar isMobile user={{ id: "1" }} />
      </ResponsiveProvider>,
    );
    expect(screen.getByText(/^debt$/i)).not.toBeNull();
    expect(screen.queryByText(/^tax$/i)).toBeNull();
  });
});
