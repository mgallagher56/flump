import { render, screen } from "@testing-library/react";
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

  it("renders 'Sign In', 'Get Started', and the theme toggle when flump_has_session is not present", () => {
    render(
      <HelmetProvider>
        <ThemeProvider>
          <MemoryRouter>
            <Header />
          </MemoryRouter>
        </ThemeProvider>
      </HelmetProvider>,
    );

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
});
