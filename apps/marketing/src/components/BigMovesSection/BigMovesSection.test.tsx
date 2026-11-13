import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BIG_MOVES, BigMovesSection } from "./BigMovesSection";

const renderSection = () =>
  render(
    <MemoryRouter>
      <BigMovesSection />
    </MemoryRouter>,
  );

describe("BigMovesSection", () => {
  it("shows rent or mortgage, debts and pension in that order", () => {
    renderSection();
    const list = screen.getByRole("list", { name: "Big moves" });
    const headings = within(list).getAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual(["Rent or mortgage", "Debts", "Pension"]);
  });

  it("gives renting the same weight as paying a mortgage, listed first", () => {
    const home = BIG_MOVES.find((m) => m.id === "home");
    expect(home?.situations.map((s) => s.label).slice(0, 2)).toEqual([
      "Renting",
      "Paying a mortgage",
    ]);
  });

  it("frames the moves as illustrations and links to the free calculators", () => {
    renderSection();
    expect(screen.getByText(/not advice/)).toBeDefined();
    expect(screen.getByRole("link", { name: "Browse free calculators" }).getAttribute("href")).toBe(
      "/tools",
    );
  });
});
