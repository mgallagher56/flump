import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { TopBar } from "./TopBar";
import { topBarBadge, topBarOptionalAction } from "./TopBar.styles";

describe("TopBar", () => {
  it("renders items as links and marks the active one with aria-current", () => {
    render(<TopBar activeKey="home" items={sampleNavItems} />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav).toBeDefined();
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBe("page");
    expect(
      screen.getByRole("link", { name: /Debt and borrowing/ }).getAttribute("aria-current"),
    ).toBeNull();
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

  it("caps a flyout to the screen below the sticky bar and lets it scroll (E42 PR 2, short tablets)", () => {
    render(<TopBar items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(trigger);
    const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
    expect(panel?.className).toContain("max-h_calc(100dvh_-_5rem)");
    expect(panel?.className).toContain("ov-y_auto");
  });

  it("closes the flyout on outside pointer down", () => {
    render(<TopBar items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("closes the flyout when a link inside it is clicked", () => {
    render(<TopBar items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("link", { name: /Pension/ }));
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

  it("puts the menu button last, on the right after the actions, on the side its drawer opens", () => {
    render(
      <TopBar
        actions={<button type="button">Account</button>}
        items={sampleNavItems}
        logo={<a href="/">Logo</a>}
        onMenuClick={() => {}}
      />,
    );
    const header = screen.getByRole("banner");
    const controls = Array.from(header.querySelectorAll("a, button"));
    expect(controls.at(-1)).toBe(screen.getByRole("button", { name: "Open menu" }));
    expect(controls[0]?.textContent).toBe("Logo");
  });

  it("marks itself as the sticky header popovers keep clear of (P32)", () => {
    render(<TopBar items={sampleNavItems} />);
    expect(screen.getByRole("banner").hasAttribute("data-sticky-header")).toBe(true);
  });

  it("hides a wideOnly group below navWide, like a wideOnly link", () => {
    const items = sampleNavItems.map((item) =>
      item.children ? { ...item, wideOnly: true } : item,
    );
    render(<TopBar items={items} />);
    const group = items.find((item) => item.children);
    const button = screen.getByRole("button", { name: new RegExp(String(group?.label)) });
    expect(button.closest("li")?.className).toContain("navWide:d_list-item");
  });

  it("reports the menu state on the menu button", () => {
    render(
      <TopBar items={sampleNavItems} menuControls="drawer" menuExpanded onMenuClick={() => {}} />,
    );
    const button = screen.getByRole("button", { name: "Open menu" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe("drawer");
  });

  it("keeps wideOnly links out of the inline bar below navWide", () => {
    render(
      <TopBar
        items={[
          { key: "a", label: "Always", href: "/a" },
          { key: "b", label: "Wide only", href: "/b", wideOnly: true },
        ]}
      />,
    );
    const wideItem = screen.getByRole("link", { name: "Wide only" }).closest("li");
    const alwaysItem = screen.getByRole("link", { name: "Always" }).closest("li");
    expect(wideItem?.className).toContain("navWide:d_list-item");
    expect(wideItem?.className).toContain("d_none");
    expect(alwaysItem?.className).not.toContain("navWide:d_list-item");
  });

  it("shows the menu button up to navWide when menuBelow is wide, a 44px target", () => {
    const { rerender } = render(<TopBar items={sampleNavItems} onMenuClick={() => {}} />);
    const button = () => screen.getByRole("button", { name: "Open menu" });
    expect(button().className).toContain("navInline:d_none");
    expect(button().className).toContain("min-w_touch");
    rerender(<TopBar items={sampleNavItems} menuBelow="wide" onMenuClick={() => {}} />);
    expect(button().className).toContain("navWide:d_none");
    expect(button().className).not.toContain("navInline:d_none");
  });

  it("keeps the inline links hidden until navWide when linksFrom is wide (P72)", () => {
    const { rerender } = render(<TopBar items={sampleNavItems} />);
    const nav = () => screen.getByRole("navigation", { name: "Primary" });
    expect(nav().className).toContain("navInline:d_block");
    expect(nav().className).not.toContain("navWide:d_block");
    rerender(<TopBar items={sampleNavItems} linksFrom="wide" menuBelow="wide" />);
    expect(nav().className).toContain("navWide:d_block");
    expect(nav().className).toContain("navInline:d_none");
  });

  it("pads the notch sides and top, and keeps a 44px floor at large text (P15, P19)", () => {
    const { container } = render(<TopBar items={sampleNavItems} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("env(safe-area-inset-top)");
    expect(root.className).toContain("env(safe-area-inset-left)");
    expect(root.className).toContain("env(safe-area-inset-right)");
    const inner = root.firstElementChild as HTMLElement;
    // A px floor (44px), not 3.5rem, so the phone bar does not double in height at 200% text.
    expect(inner.className).toMatch(/(^|\s)min-h_touch(\s|$)/);
    expect(inner.className).not.toMatch(/(^|\s)min-h_14(\s|$)/);
  });

  it("is a rem container, so an optional action leaves a cramped bar at large text", () => {
    const { container } = render(<TopBar items={sampleNavItems} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("cq-t_inline-size");
    expect(root.className).toContain("cq-n_top-bar");
    // The side padding follows the root font size by a hair, so a text-size change resizes the
    // container and Chrome re-checks the query (phone sweep 4).
    expect(root.className).toContain("calc(0.0625rem_-_1px)");
    expect(topBarOptionalAction()).toContain("[@container_top-bar_(max-width:_17rem)]:d_none");
  });
});

describe("TopBar flyout edges", () => {
  const openPlan = () => {
    render(<TopBar activeKey="pension" items={sampleNavItems} />);
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.click(trigger);
    return trigger;
  };

  it("stays open on a pointer down inside the group", () => {
    const trigger = openPlan();
    fireEvent.pointerDown(screen.getByRole("link", { name: /Forecast/ }));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("stays open on a click on the panel that is not a link", () => {
    const trigger = openPlan();
    const panel = document.getElementById(trigger.getAttribute("aria-controls") ?? "");
    if (!panel) throw new Error("flyout panel missing");
    fireEvent.click(panel);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("stays open when focus leaves to nowhere, such as another window", () => {
    const trigger = openPlan();
    fireEvent.blur(trigger, { relatedTarget: null });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps other keys inside the open flyout from closing it", () => {
    const trigger = openPlan();
    fireEvent.keyDown(screen.getByRole("link", { name: /Forecast/ }), { key: "ArrowDown" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps Escape that closes the flyout from reaching outer handlers, and lets it through when closed", () => {
    const outer = vi.fn();
    render(
      // biome-ignore lint/a11y/noStaticElementInteractions: test harness listening for bubbling keys
      <div onKeyDown={outer}>
        <TopBar items={sampleNavItems} />
      </div>,
    );
    const trigger = screen.getByRole("button", { name: "Plan" });
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(outer).toHaveBeenCalledTimes(1);
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(outer).toHaveBeenCalledTimes(1);
  });

  it("marks only the current child as the current page", () => {
    openPlan();
    expect(screen.getByRole("link", { name: /Forecast/ }).getAttribute("aria-current")).toBeNull();
  });

  it("renders an item with an empty children list as a plain link", () => {
    render(<TopBar items={[{ key: "tools", label: "Tools", href: "/tools", children: [] }]} />);
    expect(screen.getByRole("link", { name: "Tools" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Tools" })).toBeNull();
  });

  it("shows a badge beside a link that has one, and nothing extra beside one that does not", () => {
    render(<TopBar items={sampleNavItems} />);
    expect(screen.getByRole("link", { name: /Debt and borrowing/ }).textContent).toBe(
      "Debt and borrowing2",
    );
    expect(screen.getByRole("link", { name: "Saving" }).textContent).toBe("Saving");
    // No empty badge pill either.
    const hasBadge = (link: HTMLElement) =>
      Array.from(link.querySelectorAll("span")).some((s) => s.className === topBarBadge());
    expect(hasBadge(screen.getByRole("link", { name: "Saving" }))).toBe(false);
    expect(hasBadge(screen.getByRole("link", { name: /Debt and borrowing/ }))).toBe(true);
  });
});
