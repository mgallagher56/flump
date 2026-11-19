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

  it("keeps Debt and borrowing reachable", () => {
    render(<MobileBottomBar items={sampleNavItems} />);
    expect(screen.getByRole("link", { name: "Debt and borrowing" }).getAttribute("href")).toBe(
      "/debt",
    );
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

  it("at large text wraps labels to two lines and keeps the bar compact (P19)", () => {
    render(<MobileBottomBar items={sampleNavItems} />);
    // A container query on the bar in rem, so a root font-size of 200% triggers it too (phone
    // sweep 4: an em media query never saw it, and the bar ran off the side).
    const q = "[@container_bottom-bar_(max-width:_19.99rem)]";
    const nav = screen.getByRole("navigation", { name: "Primary mobile" }).className;
    expect(nav).toContain("cq-t_inline-size");
    expect(nav).toContain("cq-n_bottom-bar");
    const label = screen.getByText("Home");
    expect(label.className).toContain(`${q}:white-space_normal`);
    expect(label.className).toContain(`${q}:lc_2`);
    const link = screen.getByRole("link", { name: "Home" });
    expect(link.className).toContain(`${q}:min-h_touch`);
  });

  it("pads the sides by the safe-area insets (P15)", () => {
    render(<MobileBottomBar items={sampleNavItems} />);
    const nav = screen.getByRole("navigation", { name: "Primary mobile" }).className;
    expect(nav).toContain("env(safe-area-inset-left)");
    expect(nav).toContain("env(safe-area-inset-right)");
  });
});
