import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";
import { sampleNavItems } from "./AppShell.fixtures";

describe("AppShell", () => {
  it("renders a skip link targeting a focusable main landmark", () => {
    render(
      <AppShell items={sampleNavItems}>
        <h1>Home</h1>
      </AppShell>,
    );
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip.getAttribute("href")).toBe("#main-content");
    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");
    expect(main.getAttribute("tabindex")).toBe("-1");
  });

  it("supports a configurable main id", () => {
    render(
      <AppShell items={sampleNavItems} mainId="content">
        <p>Body</p>
      </AppShell>,
    );
    expect(screen.getByRole("link", { name: "Skip to main content" }).getAttribute("href")).toBe(
      "#content",
    );
    expect(screen.getByRole("main").id).toBe("content");
  });

  it("keeps navigation landmarks uniquely named", () => {
    render(
      <AppShell items={sampleNavItems} showSideNav>
        <p>Body</p>
      </AppShell>,
    );
    const names = screen.getAllByRole("navigation").map((n) => n.getAttribute("aria-label"));
    expect(names).toEqual(["Primary", "Section navigation", "Primary mobile"]);
    expect(new Set(names).size).toBe(names.length);
  });

  it("omits the side nav by default and renders children", () => {
    render(
      <AppShell items={sampleNavItems}>
        <p>Body copy</p>
      </AppShell>,
    );
    expect(screen.queryByRole("navigation", { name: "Section navigation" })).toBeNull();
    expect(screen.getByText("Body copy")).toBeDefined();
  });

  it("limits the mobile bar to mobileItems", () => {
    render(
      <AppShell items={sampleNavItems} mobileItems={sampleNavItems.slice(0, 2)}>
        <p>Body</p>
      </AppShell>,
    );
    const bar = screen.getByRole("navigation", { name: "Primary mobile" });
    expect(bar.querySelectorAll("a").length).toBe(2);
  });

  it("wires onMenuClick to the top bar menu button", () => {
    const onMenuClick = vi.fn();
    render(
      <AppShell items={sampleNavItems} onMenuClick={onMenuClick}>
        <p>Body</p>
      </AppShell>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(onMenuClick).toHaveBeenCalledOnce();
  });

  it("forwards aria-current to renderLink", () => {
    const seen: Array<string | undefined> = [];
    render(
      <AppShell
        activeKey="home"
        items={sampleNavItems.slice(0, 2)}
        renderLink={(item, className, children, ariaCurrent) => {
          if (item.key === "home") seen.push(ariaCurrent);
          return (
            <a aria-current={ariaCurrent} className={className} href={item.href}>
              {children}
            </a>
          );
        }}
      >
        <p>Body</p>
      </AppShell>,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((v) => v === "page")).toBe(true);
  });

  it("shows the mobile bar on phones only: it hides at the shared nav breakpoint (768px)", async () => {
    const { mobileBottomBarRoot } = await import("../MobileBottomBar/MobileBottomBar.styles");
    expect(mobileBottomBarRoot()).toContain("navInline:d_none");
    expect(mobileBottomBarRoot()).not.toContain("lg:d_none");
  });
});
