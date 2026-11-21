import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter, type SiteFooterColumn } from "./SiteFooter";
import { siteFooterCompactLink, siteFooterCompactNav } from "./SiteFooter.styles";

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

  it("compact: one row with the logo, its links and the bottom text, no brand heading", () => {
    const { container } = render(
      <SiteFooter
        bottom="© 2026 Example Ltd"
        bottomFrom="lg"
        links={[
          { key: "a", label: "Always", href: "/a" },
          { key: "p", label: "Phones", href: "/p", show: "belowMd" },
          { key: "w", label: "Wide", href: "/w", show: "fromMd" },
        ]}
        logo={<a href="/">Logo</a>}
        variant="compact"
      />,
    );
    expect(screen.getByRole("contentinfo")).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Footer" });
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    const item = (name: string) =>
      screen.getByRole("link", { name }).closest("li")?.className ?? "";
    expect(item("Phones")).toContain("md:d_none");
    expect(item("Wide")).toContain("md:d_list-item");
    expect(screen.getByText("© 2026 Example Ltd").className).toContain("lg:d_block");
    expect(screen.queryByRole("heading")).toBeNull();
    expect(container.querySelectorAll("footer > div")).toHaveLength(1);
  });

  it("compact: links that cannot all fit scroll inside the footer, never widening the page", () => {
    render(
      <SiteFooter
        links={[{ key: "a", label: "Always", href: "/a" }]}
        logo={<a href="/">Logo</a>}
        variant="compact"
      />,
    );
    // At 200% text on a phone the one line of links is wider than the screen (phone sweep 5).
    expect(screen.getByRole("navigation", { name: "Footer" }).className).toContain("ov-x_auto");
  });

  it("compact: the scrolling line leaves room for the links' whole focus ring (WCAG 2.4.7)", () => {
    // The ring reaches 2px (outline) + 2px (offset) = 4px outside the link. Spacing token "1" is
    // 4px, so the scroller's padding holds the ring and the -4px margin cancels it out.
    const ring = siteFooterCompactLink.raw()._focusVisible as Record<string, string>;
    expect(ring.outline).toBe("2px solid");
    expect(ring.outlineOffset).toBe("2px");
    const nav = siteFooterCompactNav.raw() as Record<string, string>;
    expect(nav.padding).toBe("1");
    expect(nav.margin).toBe("-1");
    render(
      <SiteFooter
        links={[{ key: "a", label: "Always", href: "/a" }]}
        logo={<a href="/">Logo</a>}
        variant="compact"
      />,
    );
    const navEl = screen.getByRole("navigation", { name: "Footer" });
    expect(navEl.className).toContain("p_1");
    expect(navEl.className).toContain("m_-1");
  });
});

describe("SiteFooter links and empty slots", () => {
  const external = {
    key: "ext",
    label: "Status page",
    href: "https://status.example.com",
    external: true,
  };
  const newTab = {
    key: "demo",
    label: "Live demo",
    href: "https://demo.example.com",
    newTab: true,
  };

  it("full: renders with no columns given", () => {
    render(<SiteFooter blurb="b" bottom="c" />);
    expect(screen.getByRole("heading", { level: 2, name: "Flump" })).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("compact: renders no links landmark when it has no links", () => {
    render(<SiteFooter bottom="c" variant="compact" />);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByText("c")).toBeTruthy();
  });

  it("full: an external link stays in this tab, and only a new-tab link says it opens one", () => {
    render(
      <SiteFooter
        blurb="b"
        bottom="c"
        columns={[{ heading: "More", links: [external, newTab] }]}
      />,
    );
    const ext = screen.getByRole("link", { name: "Status page" });
    expect(ext.getAttribute("target")).toBeNull();
    expect(ext.textContent).toBe("Status page");
    const tab = screen.getByRole("link", { name: "Live demo (opens in a new tab)" });
    expect(tab.getAttribute("target")).toBe("_blank");
  });

  it("compact: external and new-tab links are plain anchors, and only the new-tab one opens a tab", () => {
    render(
      <SiteFooter
        bottom="c"
        links={[external, newTab]}
        renderLink={(link, className, children) => (
          <a className={className} data-router="yes" href={link.href}>
            {children}
          </a>
        )}
        variant="compact"
      />,
    );
    const ext = screen.getByRole("link", { name: "Status page" });
    expect(ext.getAttribute("data-router")).toBeNull();
    expect(ext.getAttribute("target")).toBeNull();
    expect(ext.textContent).toBe("Status page");
    const tab = screen.getByRole("link", { name: "Live demo (opens in a new tab)" });
    expect(tab.getAttribute("data-router")).toBeNull();
    expect(tab.getAttribute("target")).toBe("_blank");
  });

  it("compact: routes an in-site link through renderLink", () => {
    render(
      <SiteFooter
        bottom="c"
        links={[{ key: "privacy", label: "Privacy", href: "/privacy" }]}
        renderLink={(link, className, children) => (
          <a className={className} data-router="yes" href={link.href}>
            {children}
          </a>
        )}
        variant="compact"
      />,
    );
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("data-router")).toBe("yes");
  });
});
