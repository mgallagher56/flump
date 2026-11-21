import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { SideNav } from "./SideNav";
import { sideNavBadge } from "./SideNav.styles";

describe("SideNav", () => {
  it("renders a labelled landmark with all links reachable", () => {
    render(<SideNav activeKey="borrowing" items={sampleNavItems} />);
    expect(screen.getByRole("navigation", { name: "Section navigation" })).toBeDefined();
    expect(screen.getAllByRole("link").length).toBe(6);
  });

  it("renders group headings and child descriptions", () => {
    render(<SideNav items={sampleNavItems} />);
    expect(screen.getByText("Plan")).toBeDefined();
    expect(screen.getByText("Project your retirement pot")).toBeDefined();
  });

  it("marks the active child with aria-current", () => {
    render(<SideNav activeKey="forecast" items={sampleNavItems} />);
    expect(screen.getByRole("link", { name: /Forecast/ }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  it("renders badges", () => {
    render(<SideNav items={sampleNavItems} />);
    expect(screen.getByText("2")).toBeDefined();
  });

  it("does not mark the group heading as current when a child is active", () => {
    render(<SideNav activeKey="pension" items={sampleNavItems} />);
    const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current"));
    expect(current.map((l) => l.textContent)).toEqual(["PensionProject your retirement pot"]);
  });
});

describe("SideNav entries", () => {
  it("shows a badge only beside an entry that has one", () => {
    render(
      <SideNav
        items={[
          { key: "a", label: "Accounts", href: "/accounts", badge: 3 },
          { key: "b", label: "Budget", href: "/budget" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: /Accounts/ }).textContent).toBe("Accounts3");
    expect(screen.getByRole("link", { name: "Budget" }).textContent).toBe("Budget");
    // No empty badge pill beside Budget either.
    const hasBadge = (link: HTMLElement) =>
      Array.from(link.querySelectorAll("span")).some((s) => s.className === sideNavBadge());
    expect(hasBadge(screen.getByRole("link", { name: "Budget" }))).toBe(false);
    expect(hasBadge(screen.getByRole("link", { name: /Accounts/ }))).toBe(true);
  });

  it("renders an item with an empty children list as a link, not a group", () => {
    render(<SideNav items={[{ key: "t", label: "Tools", href: "/tools", children: [] }]} />);
    expect(screen.getByRole("link", { name: "Tools" })).toBeDefined();
  });
});
