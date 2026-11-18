import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppFooter, appFooterLine } from "./AppFooter";

vi.mock("react-router", () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("AppFooter", () => {
  it("is one line: the logo linked home and the company name", () => {
    const { container } = render(<AppFooter />);
    expect(screen.getByRole("link", { name: "Flump home" }).getAttribute("href")).toBe("/");
    expect(screen.getByText(appFooterLine(new Date().getFullYear()))).toBeDefined();
    // No link columns or blurb: those moved to the account menu and the drawer.
    expect(container.querySelectorAll("nav")).toHaveLength(0);
    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("names the company with the year", () => {
    expect(appFooterLine(2026)).toMatch(/^© 2026 \S/);
    expect(appFooterLine(2026)).not.toContain("Company number");
  });

  it("uses SiteFooter without inline style attributes", () => {
    const { container } = render(<AppFooter />);
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });
});
