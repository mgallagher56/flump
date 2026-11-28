import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { eagerPages } from "../../eagerPages";
import { isKnownPath, resolveStatus } from "../../routes";
import { NotFoundPage } from "./NotFoundPage";

const renderAt = (path: string) =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <App pages={eagerPages} />
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

  it("puts the heading in one glass card beside one still orb, hidden from assistive technology (the approved prototype)", () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </HelmetProvider>,
    );
    const card = screen.getByRole("region", { name: "We cannot find that page" });
    expect(card.querySelector('svg[data-scene="not-found"]')).not.toBeNull();
    expect(
      within(card).getByRole("link", { name: "Go to the home page" }).getAttribute("href"),
    ).toBe("/");
    const orb = screen.getByTestId("not-found-orb");
    expect(orb.getAttribute("aria-hidden")).toBe("true");
    expect(
      [...orb.querySelectorAll("[data-glass-orb]")].map((o) => o.getAttribute("data-orb-tone")),
    ).toEqual(["violet"]);
    expect(card.contains(orb)).toBe(false);
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
    "/pricing",
    "/security?x=1",
    "/features",
    "/features/accounts",
    "/Features/Debt-And-Borrowing/",
    "/features/ai-connection",
    "/contact",
    "/Pricing",
  ])("200 for %s", (url) => {
    expect(isKnownPath(url)).toBe(true);
    expect(resolveStatus(url)).toBe(200);
  });

  it.each([
    "/nope",
    "/tools/nope",
    "/tools/a/b",
    // Answer 301 before SSR (server/redirects.ts); were they ever rendered they would be 404s.
    "/tools",
    "/tools/uk-100k-tax-trap-calculator",
    "/sitemap.xml",
    "/pricing/extra",
    // Answers 301 before SSR (server/redirects.ts); were it ever rendered it would be a 404.
    "/mcp",
    "/features/nope",
    "/features/accounts/extra",
  ])("404 for %s", (url) => {
    expect(resolveStatus(url)).toBe(404);
  });
});
