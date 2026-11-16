import { companyLine } from "@flump/business-details";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SUPPORT_EMAIL } from "~/utils/support";
import { AppFooter } from "./AppFooter";

vi.mock("react-router", () => ({
  Link: ({ children, className, to }: { children: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

describe("AppFooter", () => {
  it("renders the account, security, data, calculator and feedback links", () => {
    render(<AppFooter />);
    expect(screen.getByRole("navigation", { name: "Account" })).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Resources" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe(
      "/app/profile",
    );
    expect(screen.getByRole("link", { name: "Security" }).getAttribute("href")).toBe(
      "/app/profile?tab=security",
    );
    expect(screen.getByRole("link", { name: "Data and export" }).getAttribute("href")).toBe(
      "/app/profile?tab=data",
    );
    expect(screen.getByRole("link", { name: "All calculators" }).getAttribute("href")).toBe(
      "/tools",
    );
    expect(screen.getByRole("link", { name: "Send feedback" }).getAttribute("href")).toContain(
      SUPPORT_EMAIL,
    );
  });

  it("shows the quiet guidance reminder and the company line", () => {
    const { container } = render(<AppFooter />);
    expect(container.textContent).toContain("not regulated financial advice");
    expect(container.textContent).toContain(companyLine(new Date().getFullYear()));
  });

  it("uses SiteFooter without inline style attributes", () => {
    const { container } = render(<AppFooter />);
    expect(container.querySelector("footer")).not.toBeNull();
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });
});
