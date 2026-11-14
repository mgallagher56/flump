import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter, type SiteFooterColumn } from "./SiteFooter";

const columns: SiteFooterColumn[] = [
  {
    heading: "Free calculators",
    links: [{ key: "all", label: "All calculators", href: "/tools" }],
  },
  {
    heading: "Account and support",
    links: [
      { key: "signup", label: "Sign up", href: "https://app.example/signup", external: true },
      { key: "demo", label: "Live demo", href: "https://app.example/sandbox", newTab: true },
    ],
  },
];

describe("SiteFooter", () => {
  it("renders the brand, one named landmark per column and the bottom row", () => {
    render(<SiteFooter blurb="UK calculators." bottom="Company line" columns={columns} />);
    expect(screen.getByRole("heading", { level: 2, name: "Flump" })).toBeTruthy();
    expect(screen.getByText("UK calculators.")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Free calculators" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Account and support" })).toBeTruthy();
    expect(screen.getByText("Company line")).toBeTruthy();
  });

  it("routes in-site links through renderLink and keeps external links as anchors", () => {
    render(
      <SiteFooter
        blurb="b"
        bottom="c"
        columns={columns}
        renderLink={(link, className, children) => (
          <a className={className} data-router="yes" href={link.href}>
            {children}
          </a>
        )}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Account and support" });
    expect(screen.getByRole("link", { name: "All calculators" }).getAttribute("data-router")).toBe(
      "yes",
    );
    const signup = within(nav).getByRole("link", { name: "Sign up" });
    expect(signup.getAttribute("data-router")).toBeNull();
    const demo = within(nav).getByRole("link", { name: /Live demo/ });
    expect(demo.getAttribute("target")).toBe("_blank");
    expect(demo.getAttribute("rel")).toBe("noreferrer");
  });
});
