import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FeaturesIndexPage } from "./FeaturesIndexPage";

const renderPage = () =>
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/features"]}>
        <FeaturesIndexPage />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe("FeaturesIndexPage", () => {
  it("is titled 'Flump features' and never 'What Flump covers' (D1)", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Flump features" })).toBeDefined();
    expect(
      screen.getByText("Five areas, laid out the same way here and in the app."),
    ).toBeDefined();
    expect(document.body.textContent).not.toMatch(/what flump covers/i);
    expectPageRules(screen.getByRole("main"), { projectionNotices: 0 });
  });

  it("lists the five areas in the app's order, then the AI connection, each linked", () => {
    renderPage();
    const list = screen.getByRole("list", { name: "Flump features" });
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Accounts", "/features/accounts"],
      ["Budget", "/features/budget"],
      ["Pay", "/features/pay"],
      ["Savings and pension", "/features/savings-and-pension"],
      ["Debt and borrowing", "/features/debt-and-borrowing"],
      ["AI connection", "/features/ai-connection"],
    ]);
    expect(
      within(list).getByText("Switched on for an account on request during testing."),
    ).toBeDefined();
  });

  it("offers the invite and the interactive preview", () => {
    renderPage();
    const main = screen.getByRole("main");
    expect(within(main).getByRole("link", { name: "Request an invite" }).getAttribute("href")).toBe(
      "/contact#beta",
    );
    expect(
      within(main).getByRole("link", { name: "Interactive preview" }).getAttribute("href"),
    ).toBe("/preview");
  });
});
