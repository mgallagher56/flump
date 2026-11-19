import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SUPPORT_EMAIL } from "~/utils/support";
import { APP_FOOTER_LINKS, AppFooter, appFooterLine } from "./AppFooter";

vi.mock("react-router", () => ({
  Link: ({ children, to, ...rest }: { children: ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("AppFooter", () => {
  it("is one line: the logo, the footer links and the company name", () => {
    render(<AppFooter />);
    expect(screen.getByRole("link", { name: "Flump home" }).getAttribute("href")).toBe("/");
    const nav = screen.getByRole("navigation", { name: "Footer" });
    const hrefs = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href")?.split("?subject")[0]);
    expect(hrefs).toEqual([
      "/app/profile",
      "/app/profile?tab=security",
      "/app/profile?tab=data",
      "/tools",
      "/tools",
      `mailto:${SUPPORT_EMAIL}`,
    ]);
    expect(screen.getByText(appFooterLine(new Date().getFullYear()))).toBeDefined();
    // No brand heading, blurb or link columns: that was the tall footer.
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("phones keep Settings, Calculators and Send feedback; the rest show from 768px", () => {
    const at = (show: string) =>
      APP_FOOTER_LINKS.filter((link) => (link.show ?? "always") !== show).map((l) => l.label);
    // Below md everything but the fromMd links; from md everything but the belowMd short form.
    expect(at("fromMd")).toEqual(["Settings", "Calculators", "Send feedback"]);
    expect(at("belowMd")).toEqual([
      "Settings",
      "Security",
      "Data and export",
      "All calculators",
      "Send feedback",
    ]);
  });

  it("names the company with the year only", () => {
    expect(appFooterLine(2026)).toMatch(/^© 2026 \S/);
    expect(appFooterLine(2026)).not.toContain("Company number");
  });

  it("uses SiteFooter without inline style attributes", () => {
    const { container } = render(<AppFooter />);
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });
});
