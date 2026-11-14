import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeLogo } from "./HomeLogo";

describe("HomeLogo", () => {
  it("exposes a single named link to home with a decorative inline logo", () => {
    render(<HomeLogo />);
    const link = screen.getByRole("link", { name: "Flump home" });
    expect(link.getAttribute("href")).toBe("/");
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(link.querySelector("img")).toBeNull();
  });

  it("is hidden from assistive tech and the tab order when decorative", () => {
    render(<HomeLogo decorative />);
    expect(screen.queryByRole("link")).toBeNull();
    const link = screen.getByTestId("home-logo").querySelector("a");
    expect(link?.getAttribute("aria-hidden")).toBe("true");
    expect(link?.getAttribute("tabindex")).toBe("-1");
  });

  it("renders through the link slot so each site can use its own router", () => {
    render(<HomeLogo renderLink={(props) => <a href="/home" data-router="yes" {...props} />} />);
    const link = screen.getByRole("link", { name: "Flump home" });
    expect(link.getAttribute("href")).toBe("/home");
    expect(link.getAttribute("data-router")).toBe("yes");
  });

  it("is inline and theme-aware, with no raster asset or raw colour", () => {
    render(<HomeLogo />);
    expect(screen.getByTestId("home-logo").innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
  });

  it("marks the home page as current with aria-current and the mark style", () => {
    const { rerender } = render(<HomeLogo />);
    expect(
      screen.getByRole("link", { name: "Flump home" }).getAttribute("aria-current"),
    ).toBeNull();
    rerender(<HomeLogo current />);
    const link = screen.getByRole("link", { name: "Flump home" });
    expect(link.getAttribute("aria-current")).toBe("page");
    expect(link.className).toContain("navWide:");
  });
});
