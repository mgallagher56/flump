import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { MobileBottomBar } from "./MobileBottomBar";

describe("MobileBottomBar", () => {
  it("is labelled Primary mobile and lists five links, Home first", () => {
    render(<MobileBottomBar items={sampleNavItems} />);
    expect(screen.getByRole("navigation", { name: "Primary mobile" })).toBeDefined();
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(5);
    expect(links[0]?.textContent).toBe("Home");
  });

  it("keeps Borrowing reachable", () => {
    render(<MobileBottomBar items={sampleNavItems} />);
    expect(screen.getByRole("link", { name: "Borrowing" }).getAttribute("href")).toBe("/debt");
  });

  it("marks the active item, including a group whose child is active", () => {
    render(<MobileBottomBar activeKey="pension" items={sampleNavItems} />);
    expect(screen.getByRole("link", { name: "Plan" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  it("ignores items beyond five slots", () => {
    const extra = [...sampleNavItems, { key: "x", label: "Extra", href: "/x" }];
    render(<MobileBottomBar items={extra} />);
    expect(screen.queryByRole("link", { name: "Extra" })).toBeNull();
  });
});
