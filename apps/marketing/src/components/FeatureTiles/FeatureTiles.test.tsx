import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { FeatureTiles } from "./FeatureTiles";

const renderTiles = (headingLevel: 2 | 3) =>
  render(
    <MemoryRouter>
      <FeatureTiles headingLevel={headingLevel} />
    </MemoryRouter>,
  );

describe("FeatureTiles", () => {
  it("lists the five areas in the app's order, then the AI connection, each linked", () => {
    renderTiles(2);
    const list = screen.getByRole("list", { name: "Flump features" });
    expect(
      within(list)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")]),
    ).toEqual([
      ["Accounts", "/features/accounts"],
      ["Budget", "/features/budget"],
      ["Pay", "/features/pay"],
      ["Savings and pension", "/features/savings-and-pension"],
      ["Debt and borrowing", "/features/debt-and-borrowing"],
      ["AI connection", "/features/ai-connection"],
    ]);
  });

  it("gives the AI connection tile the decided wording (coordinator, 20 November 2026)", () => {
    renderTiles(3);
    expect(screen.getByText("Ask an AI assistant about your saved figures")).toBeDefined();
    expect(screen.getByText("Switched on for an account on request during testing.")).toBeDefined();
  });

  it("uses the heading level it is given", () => {
    const { unmount } = renderTiles(2);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(6);
    unmount();
    renderTiles(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });
});
