import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { Header, MAIN_ID } from "./Header";

describe("Header", () => {
  beforeEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie testing helper
    document.cookie = "flump_has_session=; path=/; max-age=0";
  });

  it("starts with a skip link and lists the Features group first in the menu, then each page with a hint", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip.getAttribute("href")).toBe(`#${MAIN_ID}`);
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const drawer = screen.getByRole("navigation", { name: "Mobile navigation" });
    // E42 S4: the five areas under the "Features" heading, as in the app, then the AI connection
    // and Security and privacy.
    const group = within(drawer).getByRole("list", { name: "Features" });
    expect(
      within(group)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Flump features", "/features"],
      ["Accounts", "/features/accounts"],
      ["Budget", "/features/budget"],
      ["Pay", "/features/pay"],
      ["Savings and pension", "/features/savings-and-pension"],
      ["Debt and borrowing", "/features/debt-and-borrowing"],
      ["AI connection", "/features/ai-connection"],
      ["Security and privacy", "/security"],
    ]);
    expect(within(drawer).queryByRole("link", { name: /calculators/i })).toBeNull();
    // Each hint adds meaning rather than repeating its label (P71).
    for (const [label, hint] of [
      ["Preview", "Sample figures"],
      ["Pricing", "Free during the beta"],
      ["Contact", "Email us"],
    ]) {
      const link = within(drawer).getByRole("link", { name: new RegExp(`^${label}`) });
      expect(link.textContent).toBe(`${label}${hint}`);
    }
    // P71: the menu offers Contact; the top bar does not.
    expect(
      within(drawer)
        .getByRole("link", { name: /^Contact/ })
        .getAttribute("href"),
    ).toBe("/contact");
    const primary = screen.getByRole("navigation", { name: "Primary" });
    expect(within(primary).queryByRole("link", { name: /Contact/ })).toBeNull();
  });

  it("renders three top links (a Features menu, Preview, Pricing), 'Sign in', the invite CTA, and theme toggle when no session", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

    const primary = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(primary)
        .getAllByRole("listitem")
        .filter((li) => li.parentElement?.parentElement === primary)
        .map((li) => li.textContent),
    ).toEqual(["Features", "Preview", "Pricing"]);
    expect(screen.queryByRole("link", { name: /calculators/i })).toBeNull();
    expect(within(primary).queryByRole("link", { name: "AI connection" })).toBeNull();
    // The Features menu opens on press and lists the areas, the AI connection and Security.
    const features = within(primary).getByRole("button", { name: "Features" });
    expect(features.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(features);
    expect(features.getAttribute("aria-expanded")).toBe("true");
    for (const [name, href] of [
      ["Flump features", "/features"],
      ["Debt and borrowing", "/features/debt-and-borrowing"],
      ["AI connection", "/features/ai-connection"],
      ["Security and privacy", "/security"],
    ]) {
      expect(
        within(primary)
          .getByRole("link", { name: new RegExp(`^${name}`) })
          .getAttribute("href"),
      ).toBe(href);
    }
    // /sandbox now redirects to sign-up, so the try-it link goes to the interactive preview.
    const preview = screen.getByRole("link", { name: "Preview" });
    expect(preview.getAttribute("href")).toBe("/preview");
    expect(preview.getAttribute("target")).toBeNull();
    expect(document.querySelector('a[href*="/sandbox"]')).toBeNull();
    expect(document.querySelector('a[href^="/mcp"], a[href^="/tools"]')).toBeNull();

    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
    // Rule B15: "Request an invite" everywhere signed out.
    const inviteLinks = screen.getAllByText("Request an invite");
    expect(inviteLinks.length).toBeGreaterThan(0);
    expect(inviteLinks[0].closest("a")?.getAttribute("href")).toBe("/contact#beta");
    expect(screen.getAllByRole("group", { name: "Colour theme" })).toHaveLength(1);
    expect(screen.queryByText("Go to dashboard")).toBeNull();
  });

  it("uses the shared logo linked home, with no text wordmark", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );
    const home = screen.getByRole("link", { name: "Flump home" });
    expect(home.getAttribute("href")).toBe("/");
    expect(home.querySelector("svg")).not.toBeNull();
  });

  it("marks the current section with aria-current", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={["/pricing"]}>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );
    expect(screen.getByRole("link", { name: "Pricing" }).getAttribute("aria-current")).toBe("page");
  });

  it.each([
    ["/features/budget", "Budget"],
    ["/features/ai-connection/", "AI connection"],
    ["/security", "Security and privacy"],
  ])("on %s marks the Features menu and, in the phone menu, the page's own link", (path, label) => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[path]}>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );
    const primary = screen.getByRole("navigation", { name: "Primary" });
    expect(
      within(primary).getByRole("button", { name: "Features" }).getAttribute("aria-current"),
    ).toBe("page");
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const group = screen.getByRole("list", { name: "Features" });
    expect(within(group).getByRole("link", { current: "page" }).textContent).toBe(label);
  });

  it("renders 'Go to dashboard' when flump_has_session=1 cookie is present", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie testing helper
    document.cookie = "flump_has_session=1; path=/";

    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

    expect(screen.getByText("Go to dashboard")).toBeDefined();
    expect(screen.queryByText("Sign in")).toBeNull();
    expect(screen.queryByText("Request an invite")).toBeNull();
    expect(screen.getAllByRole("group", { name: "Colour theme" })).toHaveLength(1);
  });

  it("toggles the mobile navigation drawer when clicking the mobile menu button", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

    const toggleButton = screen.getByRole("button", { name: /open navigation menu/i });
    expect(toggleButton).toBeDefined();
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).toBeNull();

    // Open mobile menu
    fireEvent.click(toggleButton);

    expect(toggleButton.getAttribute("aria-expanded")).toBe("true");
    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    expect(mobileNav).toBeDefined();
    expect(within(mobileNav).getByRole("link", { name: /pricing/i })).toBeDefined();
    expect(within(screen.getByRole("dialog")).getByText("Request an invite")).toBeDefined();

    // Close mobile menu from the drawer's close button
    fireEvent.click(screen.getByRole("button", { name: /close navigation menu/i }));
    expect(toggleButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).toBeNull();
  });

  it("closes the mobile drawer when clicking a mobile nav link", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

    const toggleButton = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(toggleButton);

    const mobilePricingLink = screen
      .getByRole("navigation", { name: /mobile navigation/i })
      .querySelector('a[href="/pricing"]');
    expect(mobilePricingLink).not.toBeNull();

    if (mobilePricingLink) {
      fireEvent.click(mobilePricingLink);
    }

    expect(screen.queryByRole("navigation", { name: /mobile navigation/i })).toBeNull();
  });

  it("renders mobile drawer with dashboard link when session is present", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie testing helper
    document.cookie = "flump_has_session=1; path=/";

    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

    const toggleButton = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(toggleButton);

    const mobileNav = screen.getByRole("navigation", { name: /mobile navigation/i });
    expect(mobileNav).toBeDefined();
    expect(screen.getAllByText("Go to dashboard").length).toBeGreaterThan(0);
  });

  it("links Security and privacy in the mobile drawer without FCA wording", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const drawer = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(
      within(drawer).getByRole("link", { name: "Security and privacy" }).getAttribute("href"),
    ).toBe("/security");
    expect(screen.queryByText("FCA AISP")).toBeNull();
  });

  it("on a cramped bar (a phone at large text) keeps only the logo, theme and menu buttons", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );
    // The TopBar is a container queried in rem, so a 200% root font size reaches it (phone sweep
    // 4: the invite button and menu ran to 461px on a 375px screen).
    expect(document.querySelector("header")?.className).toContain("cq-n_top-bar");
    const invite = screen.getAllByRole("link", { name: /invite/i })[0];
    const auth = invite?.closest("div")?.className ?? "";
    expect(auth).toContain("[@container_top-bar_(max-width:_17rem)]:d_none");
    // Sign in and the invite stay reachable in the menu.
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const drawer = document.getElementById("mobile-nav-drawer") as HTMLElement;
    expect(within(drawer).getByRole("link", { name: "Sign in" })).toBeDefined();
    expect(within(drawer).getAllByRole("link", { name: /invite/i }).length).toBeGreaterThan(0);
  });

  it("below 1024px shows the menu button and no inline links, and one theme button", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );
    const primary = screen.getByRole("navigation", { name: "Primary" });
    // P72: one switch at navWide (1024px). Below it the bar hides its inline nav and shows the
    // menu button; from it the reverse, so the navigation never appears twice. TopBar's
    // linksFrom="wide" hides the nav itself below navWide.
    expect(primary.className).toContain("navInline:d_none");
    expect(primary.className).toContain("navWide:d_block");
    expect(within(primary).getByRole("link", { name: /^Preview$/ })).toBeDefined();
    expect(screen.getAllByRole("link", { name: /Sign in/ })[0]?.parentElement?.className).toContain(
      "navWide:d_inline-flex",
    );
    expect(screen.getByRole("button", { name: /open navigation menu/i }).className).toContain(
      "navWide:d_none",
    );
    expect(screen.getByRole("button", { name: /^Colour theme: / })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByRole("link", { name: /AI connection/ })).toBeDefined();
    expect(within(drawer).getByRole("link", { name: /Sign in/ })).toBeDefined();
    // The theme switch lives in the top bar at every width, so the drawer leaves it out.
    expect(within(drawer).queryByRole("group", { name: "Colour theme" })).toBeNull();
  });
});
