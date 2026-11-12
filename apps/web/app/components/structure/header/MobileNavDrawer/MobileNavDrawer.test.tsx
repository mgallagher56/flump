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

describe("<MobileNavDrawer /> keyboard", () => {
  test("Escape closes the drawer and the close button receives focus", () => {
    const onClose = vi.fn();
    customRender(<MobileNavDrawer isOpen={true} user={{ id: "1" }} onClose={onClose} />);
    expect(document.activeElement).toBe(screen.getByLabelText("Close navigation menu"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
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
