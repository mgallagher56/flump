import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
});
