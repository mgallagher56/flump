import { expectPageRules } from "@repo/ui/testing";
import { render, screen, within } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ALL_FEATURE_LINES } from "../../utils/featureIndex";
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
  it("is headed 'Everything Flump does' (the approved features prototype) and never 'What Flump covers' (D1)", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Everything Flump does" })).toBeDefined();
    expect(
      screen.getByText(
        "You add your figures once. Flump shows your net worth, what is left over each month, your pay, your savings and what you owe.",
      ),
    ).toBeDefined();
    expect(screen.getByText("Select a line to read a little more.")).toBeDefined();
    expect(document.body.textContent).not.toMatch(/what flump covers/i);
    expectPageRules(screen.getByRole("main"), { projectionNotices: 0 });
  });

  it("shows Start here, then every group, each area heading linked to its page", () => {
    renderPage();
    expect(screen.getByRole("navigation", { name: "Start here" })).toBeDefined();
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .filter((heading) => heading.id.startsWith("group-"));
    expect(
      headings.map((heading) => [
        heading.textContent,
        heading.querySelector("a")?.getAttribute("href") ?? null,
      ]),
    ).toEqual([
      ["Home and setup", null],
      ["Accounts", "/features/accounts"],
      ["Budget", "/features/budget"],
      ["Pay", "/features/pay"],
      ["Savings and pension", "/features/savings-and-pension"],
      ["Debt and borrowing", "/features/debt-and-borrowing"],
      ["AI connection", "/features/ai-connection"],
      ["Settings and your data", null],
    ]);
    expect(document.querySelectorAll("main details")).toHaveLength(ALL_FEATURE_LINES.length);
    // Start here comes before the index, and the hero before both.
    const order = ["features-title", "start-here-title", "group-home"].map((id) =>
      document.getElementById(id),
    );
    expect(order.every(Boolean)).toBe(true);
    expect(
      order[0]?.compareDocumentPosition(order[1] as Node) === Node.DOCUMENT_POSITION_FOLLOWING &&
        order[1]?.compareDocumentPosition(order[2] as Node) === Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(true);
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
