import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { isKnownPath, resolveStatus } from "../../routes";
import { NotFoundPage } from "./NotFoundPage";

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("NotFoundPage", () => {
  it("renders a not-found heading with a link home", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </HelmetProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "We cannot find that page" }),
    ).toBeDefined();
    expect(screen.getByRole("link", { name: "Go to the home page" }).getAttribute("href")).toBe(
      "/",
    );
  });

  it("matches the web not-found card and says 'not found' once, with one way back", () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </HelmetProvider>,
    );
    const main = screen.getByRole("main");
    expect(container.querySelector('[data-scene="not-found"]')).not.toBeNull();
    expect(main.textContent).not.toMatch(/Not found|Error 404/);
    expect(main.querySelectorAll("a")).toHaveLength(1);
  });

  it.each(["/nope", "/tools/not-a-real-tool"])("App renders it for %s", (path) => {
    renderAt(path);
    expect(
      screen.getByRole("heading", { level: 1, name: "We cannot find that page" }),
    ).toBeDefined();
  });

  it("does not render it for a real page", () => {
    renderAt("/pricing");
    expect(screen.queryByRole("heading", { name: "We cannot find that page" })).toBeNull();
  });
});

describe("resolveStatus", () => {
  it.each([
    "/",
    "/tools",
    "/tools/",
    "/pricing",
    "/security?x=1",
    "/mcp",
    "/contact",
    "/Pricing",
    "/TOOLS/UK-100k-Tax-Trap-Calculator",
    "/tools/uk-100k-tax-trap-calculator",
    "/tools/overdraft-interest-calculator",
  ])("200 for %s", (url) => {
    expect(isKnownPath(url)).toBe(true);
    expect(resolveStatus(url)).toBe(200);
  });

  it.each(["/nope", "/tools/nope", "/tools/a/b", "/sitemap.xml", "/pricing/extra"])(
    "404 for %s",
    (url) => {
      expect(resolveStatus(url)).toBe(404);
    },
  );
});
