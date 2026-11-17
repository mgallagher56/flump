import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MONEYHELPER_PENSIONS_URL, MoneyHelperGuidance } from "./MoneyHelperGuidance";

describe("MoneyHelperGuidance", () => {
  it("links to MoneyHelper's pensions and retirement page in a new tab", () => {
    render(<MoneyHelperGuidance />);
    const link = screen.getByRole("link", {
      name: /Pension guidance from MoneyHelper.*opens in a new tab/i,
    });
    expect(MONEYHELPER_PENSIONS_URL).toBe(
      "https://www.moneyhelper.org.uk/en/pensions-and-retirement",
    );
    expect(link.getAttribute("href")).toBe(MONEYHELPER_PENSIONS_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("shows the fixed wording, with no judgement or call to action", () => {
    const { container } = render(<MoneyHelperGuidance />);
    expect(container.textContent).toContain(
      "MoneyHelper offers free, impartial guidance on pensions, backed by the government.",
    );
    expect(container.textContent).not.toMatch(/should|need|urgent|worried|short|behind/i);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("takes no inputs, so it renders identically for every user (R3 exception, R4)", () => {
    const first = render(<MoneyHelperGuidance />).container.innerHTML;
    const second = render(<MoneyHelperGuidance />).container.innerHTML;
    expect(first).toBe(second);
    expect(MoneyHelperGuidance.length).toBeLessThanOrEqual(1);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
