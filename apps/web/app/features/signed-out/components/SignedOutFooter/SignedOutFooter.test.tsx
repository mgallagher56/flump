import { companyLine } from "@flump/business-details";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SUPPORT_EMAIL } from "~/utils/support";
import { SignedOutFooter } from "./SignedOutFooter";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("SignedOutFooter", () => {
  it("renders the calculator, account and support links", () => {
    render(<SignedOutFooter />);
    expect(screen.getByRole("navigation", { name: "Calculators" })).toBeDefined();
    expect(screen.getByRole("link", { name: "All calculators" }).getAttribute("href")).toBe(
      "/tools",
    );
    expect(screen.getByRole("link", { name: "Sign up" }).getAttribute("href")).toBe("/signup");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
    expect(screen.getByRole("link", { name: "Send feedback" }).getAttribute("href")).toContain(
      SUPPORT_EMAIL,
    );
  });

  it("lists no per-tool links, only All calculators (same rule as marketing)", async () => {
    const { TOOL_CATALOGUE } = await import("@repo/ui/tools");
    render(<SignedOutFooter />);
    for (const tool of TOOL_CATALOGUE) {
      expect(screen.queryByRole("link", { name: tool.shortTitle })).toBeNull();
    }
  });

  it("shows the company line from the business details config", () => {
    const { container } = render(<SignedOutFooter />);
    expect(container.textContent).toContain(companyLine(new Date().getFullYear()));
  });
});
