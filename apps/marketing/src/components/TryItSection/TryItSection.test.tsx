import { expectPageRules } from "@repo/ui/testing";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { TryItSection } from "./TryItSection";

const renderSection = (area: "pay" | "debt-and-borrowing") =>
  render(
    <MemoryRouter>
      <TryItSection area={area} />
    </MemoryRouter>,
  );

describe("TryItSection (D9)", () => {
  it("on Pay: the two-slider pay rise tool, no link, and where the app does it with saved figures", () => {
    renderSection("pay");
    const section = screen.getByRole("region", { name: "Try it with your own numbers" });
    expect(
      within(section).getByRole("heading", { level: 3, name: "What you keep from a pay rise" }),
    ).toBeDefined();
    expect(within(section).getAllByRole("slider")).toHaveLength(2);
    expect(within(section).queryByRole("link")).toBeNull();
    expect(
      within(section).getByText(
        "In the app, the pay rise tool on Take-home pay uses your saved salary.",
      ),
    ).toBeDefined();
  });

  it("on Debt and borrowing: the two short forms under their plain names, the mortgage part last", () => {
    renderSection("debt-and-borrowing");
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([
      "Two ways to pay off debts",
      "Mortgage overpayment or ISA, compared",
    ]);
    const mortgage = screen.getByRole("region", { name: "Mortgage overpayment or ISA, compared" });
    expect(within(mortgage).getByText("If you have a mortgage")).toBeDefined();
    // Short forms: no calculator title of their own, no sign-up button.
    expect(screen.queryByText("Debt payoff methods compared")).toBeNull();
    expect(screen.queryByRole("button", { name: /sign up/i })).toBeNull();
    expect(screen.queryByText(/better|best|should/i)).toBeNull();
  });

  it("opens each short form's details on request", () => {
    renderSection("debt-and-borrowing");
    const debts = screen.getByRole("region", { name: "Two ways to pay off debts" });
    const toggle = within(debts).getByRole("button", { name: "Change the debt details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(within(debts).getByRole("button", { name: /add a debt/i })).toBeDefined();
  });

  it("keeps one notice in each calculator and no primary button", () => {
    renderSection("debt-and-borrowing");
    for (const name of ["Two ways to pay off debts", "Mortgage overpayment or ISA, compared"]) {
      const region = screen.getByRole("region", { name });
      expectPageRules(region, { projectionNotices: 1 });
      expect(region.querySelector('[data-variant="primary"]')).toBeNull();
    }
  });
});
