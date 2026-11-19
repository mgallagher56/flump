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

  it("starts with a skip link to the main landmark and gives each menu item a one-line hint", () => {
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
    // Each hint adds meaning rather than repeating its label (P71).
    for (const [label, hint] of [
      ["Calculators", "No sign-in needed"],
      ["Pricing", "Free during the beta"],
      ["Security", "What Flump can see"],
      ["AI connection", "Use with Claude"],
      ["Preview", "Sample figures"],
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

  it("renders desktop navigation links, 'Sign in', the invite CTA, and theme toggle when no session", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

    expect(screen.getByRole("link", { name: /calculators/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /pricing/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /security/i })).toBeDefined();
    // /sandbox now redirects to sign-up, so the try-it link goes to the interactive preview.
    const preview = screen.getByRole("link", { name: "Preview" });
    expect(preview.getAttribute("href")).toBe("/preview");
    expect(preview.getAttribute("target")).toBeNull();
    expect(document.querySelector('a[href*="/sandbox"]')).toBeNull();
    expect(screen.getByRole("link", { name: "AI connection" })).toBeDefined();

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

  it("shows the Security sub-label in the mobile drawer without FCA wording", () => {
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
    expect(screen.getByText("What Flump can see")).toBeDefined();
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
    for (const name of [/AI connection/, /^Preview$/]) {
      expect(within(primary).getByRole("link", { name }).closest("li")?.className).toContain(
        "navWide:d_list-item",
      );
    }
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
