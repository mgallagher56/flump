import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ResponsiveProvider } from "~/context/ResponsiveContext";
import customRender from "~/testUtils/customRender";
import MobileBottomBar from "./MobileBottomBar";

const mocks = vi.hoisted(() => ({ active: "/app/budget" }));

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    NavLink: ({ children, to, className }: any) => (
      <a
        aria-current={to === mocks.active ? "page" : undefined}
        className={
          typeof className === "function" ? className({ isActive: to === mocks.active }) : className
        }
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
  test("shows Home, Accounts, Budget and Tax and pay in that order, then More", () => {
    customRender(
      <ResponsiveProvider initialIsMobile={true}>
        <MobileBottomBar isMobile user={{ id: "1" }} />
      </ResponsiveProvider>,
    );
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/", "/app/accounts", "/app/budget", "/app/take-home"]);
    expect(screen.getByTestId("mobile-bottom-bar-more")).not.toBeNull();
  });

  test("never reflows when modules are switched off", () => {
    customRender(
      <ResponsiveProvider initialIsMobile={true}>
        <MobileBottomBar isMobile user={{ id: "1" }} />
      </ResponsiveProvider>,
    );
    expect(screen.queryByRole("link", { name: /debt|savings/i })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });
});

describe("<MobileBottomBar /> active route", () => {
  test("only the current route's tab is highlighted", () => {
    customRender(
      <ResponsiveProvider initialIsMobile={true}>
        <MobileBottomBar isMobile user={{ id: "1" }} />
      </ResponsiveProvider>,
    );
    const current = screen.getByRole("link", { current: "page" });
    expect(current.getAttribute("href")).toBe("/app/budget");
    const other = screen.getByRole("link", { name: /^accounts$/i });
    expect(other.className).not.toBe(current.className);
  });
});

describe("<MobileBottomBar /> sandbox", () => {
  test("renders for a signed-out visitor with only Home live", () => {
    customRender(
      <ResponsiveProvider initialIsMobile={true}>
        <MobileBottomBar isMobile sandbox user={null} />
      </ResponsiveProvider>,
    );
    expect(screen.getByTestId("mobile-bottom-bar")).not.toBeNull();
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/sandbox"]);
    for (const name of [/accounts/i, /budget/i, /tax/i]) {
      const disabled = screen.getByRole("button", { name });
      expect(disabled.getAttribute("aria-disabled")).toBe("true");
      expect((disabled as HTMLButtonElement).disabled).toBe(false);
      const hint = document.getElementById(disabled.getAttribute("aria-describedby") ?? "");
      expect(hint?.textContent).toBe("signUpToOpen");
    }
    expect(screen.getByTestId("mobile-bottom-bar-more")).not.toBeNull();
  });
});
