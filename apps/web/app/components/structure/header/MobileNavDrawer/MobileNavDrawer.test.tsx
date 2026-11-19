import { buttonVariants } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { mobileLink } from "~/components/navigation/NavMenu/NavMenu.styles";
import customRender from "~/testUtils/customRender";
import MobileNavDrawer, { currentFooterRow } from "./MobileNavDrawer";

const mockLocation = { pathname: "/", search: "" };

vi.mock("react-router", async () => {
  const actual: Record<string, unknown> = await vi.importActual("react-router");
  return {
    ...actual,
    useLocation: () => mockLocation,
    // No data router here: no root data (signed out) and an inert reload (audit slice 8).
    useRouteLoaderData: () => undefined,
    useRevalidator: () => ({ revalidate: vi.fn(), state: "idle" }),
    Link: ({ children, to, onClick, "aria-current": ariaCurrent }: any) => (
      <a aria-current={ariaCurrent} href={to} onClick={onClick}>
        {children}
      </a>
    ),
    Form: ({ children, action, method, className }: any) => (
      <form action={action} className={className} method={method}>
        {children}
      </form>
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

vi.mock("~/components/navigation/renderHomeLogoLink", () => ({
  renderHomeLogoLink: () => <div>HomeLogo</div>,
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

describe("<MobileNavDrawer /> keyboard", () => {
  test("Escape closes the drawer and the close button receives focus", () => {
    const onClose = vi.fn();
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={onClose} />);
    expect(document.activeElement).toBe(screen.getByLabelText("Close navigation menu"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("links Settings, Connect AI and Free calculators for signed-in users", () => {
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/app/profile");
    expect(hrefs).toContain("/app/profile?tab=ai_connections");
    expect(hrefs).toContain("/tools");
  });

  test("signed in, Sign out is a row like the links above it, with an icon, posting to /logout (P14)", () => {
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />);
    const signOut = screen.getByRole("button", { name: "logOut" });
    expect(signOut.closest("form")?.getAttribute("action")).toBe("/logout");
    expect(signOut.closest("form")?.getAttribute("method")).toBe("post");
    expect(signOut.querySelector("svg")).not.toBeNull();
    // The same row recipe as Settings, Connect AI and Free calculators.
    expect(signOut.className).toBe(cx(buttonVariants({ variant: "ghost" }), mobileLink()));
    expect(screen.queryByText("UserLogin")).toBeNull();
  });

  test("signed out, the footer keeps the sign-in links", () => {
    customRender(<MobileNavDrawer isOpen={true} user={null} onClose={vi.fn()} />);
    expect(screen.getByText("UserLogin")).toBeDefined();
    expect(screen.queryByRole("button", { name: "logOut" })).toBeNull();
  });

  test("signed in, leaves out the bottom bar's pages (owner ruling: no second list)", () => {
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />);
    const hrefs = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    for (const href of ["/", "/app/accounts", "/app/budget", "/app/take-home"]) {
      expect(hrefs).not.toContain(href);
    }
  });

  test("lists Debt for signed-in users", () => {
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />);
    expect(screen.getAllByText("debt").length).toBeGreaterThan(0);
  });
});

describe("<MobileNavDrawer /> modal behaviour", () => {
  test("is exposed as a modal dialog", () => {
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  test("Tab wraps from the last to the first control and Shift+Tab the other way", () => {
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  test("returns focus to the opener when closed", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    const { rerender } = customRender(
      <MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />,
    );
    expect(document.activeElement).not.toBe(opener);
    rerender(<MobileNavDrawer isOpen={false} user={{ id: "1" }} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe("<MobileNavDrawer /> sandbox", () => {
  test("lists only what the bottom bar does not, all disabled for a signed-out visitor", () => {
    customRender(<MobileNavDrawer sandbox isOpen={true} user={null} onClose={vi.fn()} />);
    // Home, Accounts, Budget and Pay are in the bottom bar, so not repeated here.
    for (const key of ["budget", "accounts", "takeHome"]) {
      expect(screen.queryByTestId(`nav-disabled-${key}`)).toBeNull();
    }
    expect(screen.queryByRole("link", { name: /home/i })).toBeNull();
    for (const key of ["debt", "savings", "pension", "mortgage", "tax"]) {
      const item = screen.getByTestId(`nav-disabled-${key}`) as HTMLButtonElement;
      expect(item.getAttribute("aria-disabled")).toBe("true");
      expect(item.disabled).toBe(false);
      expect(item.textContent).toMatch(/signUpToOpen/);
    }
  });

  test("puts a Sign up link first and keeps disabled items inside the focus trap", () => {
    customRender(<MobileNavDrawer sandbox isOpen={true} user={null} onClose={vi.fn()} />);
    const signUp = screen.getByRole("link", { name: /signUp/ });
    expect(signUp.getAttribute("href")).toBe("/signup");
    const dialog = screen.getByTestId("mobile-nav-drawer");
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
    );
    expect(focusable).toContain(screen.getByTestId("nav-disabled-debt"));
    // Wrapping Tab from the last focusable element returns to the first (the close button).
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusable[0]);
  });

  test("shows only Home when signed out outside the sandbox", () => {
    customRender(<MobileNavDrawer isOpen={true} user={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId("nav-disabled-debt")).toBeNull();
  });
});

describe("<MobileNavDrawer /> current page", () => {
  afterEach(() => {
    mockLocation.pathname = "/";
    mockLocation.search = "";
  });

  test.each([
    ["/app/profile", "", "settings"],
    ["/app/profile", "?tab=security", "settings"],
    ["/app/profile", "?tab=ai_connections", "connectAi"],
    ["/tools", "", "tools"],
    ["/tools/mortgage-overpayment-vs-isa-calculator", "", "tools"],
    ["/app/mortgage", "", undefined],
    ["/app/budget", "", undefined],
    ["/toolsmith", "", undefined],
  ])("%s%s marks %s", (pathname, search, row) => {
    expect(currentFooterRow(pathname, search)).toBe(row);
  });

  test("marks only the current footer row, so Settings and Connect AI never both show current", () => {
    mockLocation.pathname = "/app/profile";
    mockLocation.search = "?tab=ai_connections";
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={vi.fn()} />);
    const current = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.getAttribute("href"))).toEqual([
      "/app/profile?tab=ai_connections",
    ]);
  });
});
