import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { sampleNavItems } from "../AppShell/AppShell.fixtures";
import { SideNav } from "./SideNav";

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
});
