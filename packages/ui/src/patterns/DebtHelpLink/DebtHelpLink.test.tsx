import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DebtHelpLink, MONEYHELPER_DEBT_ADVICE_URL } from "./DebtHelpLink";

describe("DebtHelpLink", () => {
  it("pins the fixed line and URL word for word (copy guide 7.3, owner R3 exception)", () => {
    const { container } = render(<DebtHelpLink />);
    expect(container.textContent).toBe(
      "Free, impartial debt help is available from MoneyHelper (opens in a new tab).",
    );
    expect(MONEYHELPER_DEBT_ADVICE_URL).toBe(
      "https://www.moneyhelper.org.uk/en/money-troubles/dealing-with-debt/debt-advice-locator",
    );
  });

  it("links to MoneyHelper's debt advice locator in a new tab, with an external-link cue", () => {
    render(<DebtHelpLink />);
    const link = screen.getByRole("link", { name: /MoneyHelper.*opens in a new tab/i });
    expect(link.getAttribute("href")).toBe(MONEYHELPER_DEBT_ADVICE_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.querySelector("svg")).not.toBeNull();
  });

  it("uses neutral wording with no judgement or urgency", () => {
    const { container } = render(<DebtHelpLink />);
    expect(container.textContent).toContain("Free, impartial debt help is available from");
    expect(container.textContent).not.toMatch(/struggl|worried|should|urgent|problem/i);
  });

  it("names MoneyHelper as the only service (R3 exception)", () => {
    render(<DebtHelpLink />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
