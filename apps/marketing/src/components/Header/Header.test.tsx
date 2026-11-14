import { fireEvent, render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { CANONICAL_TOOL_SLUGS } from "../../utils/toolSlugs";
import { Header, MAIN_ID } from "./Header";

describe("Header", () => {
  beforeEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie testing helper
    document.cookie = "flump_has_session=; path=/; max-age=0";
  });

  it("starts with a skip link to the main landmark and counts every calculator", () => {
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
    expect(screen.getByText(`${CANONICAL_TOOL_SLUGS.length} calculators`)).toBeDefined();
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
    expect(screen.getByRole("link", { name: /^Sample data/ })).toBeDefined();
    expect(screen.getByRole("link", { name: "AI connection" })).toBeDefined();

    expect(screen.getAllByText("Sign in").length).toBeGreaterThan(0);
    // Full and compact labels now read the same ("Request an invite"), one link.
    const invites = screen.getAllByText("Request an invite").map((el) => el.closest("a"));
    expect(new Set(invites).size).toBe(1);
    expect(invites[0]?.getAttribute("href")).toBe("/contact#beta");
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
    expect(screen.getByText("Security and privacy")).toBeDefined();
    expect(screen.queryByText("FCA AISP")).toBeNull();
  });
});
