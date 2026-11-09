import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";
import { Header } from "./Header";

describe("Header", () => {
  beforeEach(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie testing helper
    document.cookie = "flump_has_session=; path=/; max-age=0";
  });

  it("renders desktop navigation links, 'Sign In', 'Get Started', and theme toggle when no session", () => {
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
    expect(screen.getByRole("link", { name: /live demo/i })).toBeDefined();

    expect(screen.getByText("Sign In")).toBeDefined();
    expect(screen.getByText("Get Started")).toBeDefined();
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeDefined();
    expect(screen.queryByText("Go to Dashboard →")).toBeNull();
  });

  it("renders 'Go to Dashboard →' when flump_has_session=1 cookie is present", () => {
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

    expect(screen.getByText("Go to Dashboard →")).toBeDefined();
    expect(screen.queryByText("Sign In")).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeDefined();
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
    expect(screen.getByText("Get Started Free")).toBeDefined();

    // Close mobile menu by clicking toggle again
    fireEvent.click(toggleButton);
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
});
