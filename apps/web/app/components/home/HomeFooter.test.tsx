import { companyLine } from "@flump/business-details";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { SUPPORT_EMAIL } from "~/utils/support";
import HomeFooter from "./HomeFooter";

vi.mock("react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe("HomeFooter", () => {
  it("renders footer columns and calculator links", () => {
    render(<HomeFooter />);

    expect(screen.getByText("Flump")).toBeDefined();
    expect(screen.getByText("Platform")).toBeDefined();
    expect(screen.getByText("Free calculators")).toBeDefined();
    expect(screen.getByText("Account and support")).toBeDefined();

    expect(screen.getByRole("link", { name: "£100k tax trap" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Mortgage vs ISA" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Section 24 landlord" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Snowball vs avalanche" })).toBeDefined();
  });

  it("shows the company line from the business details config", () => {
    const { container } = render(<HomeFooter />);
    expect(container.textContent).toContain(companyLine(new Date().getFullYear()));
  });

  it("has no fake form and links feedback to a mailto", () => {
    const { container } = render(<HomeFooter />);

    expect(container.querySelector("form, textarea, input")).toBeNull();
    expect(screen.queryByText(/message has been received/i)).toBeNull();
    const link = screen.getByRole("link", { name: "Send feedback" });
    expect(link.getAttribute("href")?.startsWith(`mailto:${SUPPORT_EMAIL}`)).toBe(true);
  });
});
