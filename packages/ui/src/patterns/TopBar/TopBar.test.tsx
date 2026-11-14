import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { TopBar } from "./TopBar";

describe("TopBar", () => {
  it("renders items as links and marks the active one with aria-current", () => {
    render(<TopBar activeKey="home" items={sampleNavItems} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeDefined();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: /Borrowing/ }).getAttribute("aria-current")).toBeNull();
  });

  it("uses the renderLink slot", () => {
    const renderLink = vi.fn((item, className, children) => (
      <a className={className} data-testid={`link-${item.key}`} href={item.href}>
        {children}
      </a>
    ));
    render(<TopBar items={sampleNavItems} renderLink={renderLink} />);
    expect(screen.getByTestId("link-home")).toBeDefined();
  });

  it("opens and closes a group flyout with the keyboard and sets aria-expanded", () => {
    render(<TopBar activeKey="pension" items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-current")).toBe("page");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: /Pension/ }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("See where your money could be in future")).toBeDefined();
    fireEvent.keyDown(screen.getByRole("link", { name: /Pension/ }), { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes the flyout on outside pointer down", () => {
    render(<TopBar items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("shows a menu button only when onMenuClick is supplied", () => {
    const onMenuClick = vi.fn();
    const { rerender } = render(<TopBar items={sampleNavItems} />);
    expect(screen.queryByRole("button", { name: "Open menu" })).toBeNull();
    rerender(<TopBar items={sampleNavItems} onMenuClick={onMenuClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });

  it("renders logo and action slots", () => {
    render(
      <TopBar
        actions={<button type="button">Theme</button>}
        items={[]}
        logo={<span>Flump</span>}
      />,
    );
    expect(screen.getByText("Flump")).toBeDefined();
    expect(screen.getByRole("button", { name: "Theme" })).toBeDefined();
  });

  it("closes the flyout on Escape pressed on the trigger", () => {
    render(<TopBar items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the flyout when focus leaves the group, but not when moving inside it", () => {
    render(<TopBar items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(trigger);
    const inside = screen.getByRole("link", { name: /Forecast/ });
    fireEvent.blur(trigger, { relatedTarget: inside });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.blur(inside, { relatedTarget: screen.getByRole("link", { name: "Home" }) });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });
  it("renders inline actions in a wrapper hidden below the nav breakpoint", () => {
    render(
      <TopBar
        actions={<button type="button">Account</button>}
        inlineActions={<button type="button">Theme</button>}
        items={sampleNavItems}
      />,
    );
    const theme = screen.getByRole("button", { name: "Theme" });
    expect(theme.parentElement?.className).toContain("navInline");
    expect(screen.getByRole("button", { name: "Account" })).toBeDefined();
  });

  it("reports the menu state on the menu button", () => {
    render(
      <TopBar items={sampleNavItems} menuControls="drawer" menuExpanded onMenuClick={() => {}} />,
    );
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe("drawer");
  });
});
