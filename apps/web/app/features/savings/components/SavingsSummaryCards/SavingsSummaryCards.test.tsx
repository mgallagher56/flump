import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  INTEREST_LABEL,
  interestExplain,
  KPI_PROMPT_TITLE,
  SavingsSummaryCards,
} from "./SavingsSummaryCards";

const interest = (isa: number, outsideIsa: number, accountsWithoutRate = 0) => ({
  total: isa + outsideIsa,
  isa,
  outsideIsa,
  accountsCounted: 2,
  accountsWithoutRate,
});

describe("SavingsSummaryCards", () => {
  it("shows the hero and up to 3 real KPIs", () => {
    const { container } = render(
      <SavingsSummaryCards
        accountCount={2}
        interest={interest(126.83, 123.36)}
        hasIsaAccount
        isaUsed={2400}
        monthlySaving={300}
        totalSavingsBalance={21000}
      />,
    );
    expect(container.querySelectorAll('[data-tone="hero"]')).toHaveLength(1);
    expect(screen.getByText("Total savings")).toBeDefined();
    expect(screen.getByText("£21,000")).toBeDefined();
    expect(screen.getByText("Saved each month")).toBeDefined();
    expect(screen.getByText(INTEREST_LABEL)).toBeDefined();
    // 126.83 + 123.36 = 250.19, shown to the pound.
    expect(screen.getByText("£250")).toBeDefined();
    expect(screen.getByText("An estimate, before tax. ISA interest is tax-free.")).toBeDefined();
    expect(screen.getByText("Paid into ISAs this tax year")).toBeDefined();
    // A fact from saved figures, so no Estimate chip.
    expect(screen.queryByText("Estimate")).toBeNull();
    expect(screen.queryByText("Weighted by balance (AER)")).toBeNull();
  });

  it("hides cards without a real value instead of showing £0 or 0%", () => {
    const { container } = render(
      <SavingsSummaryCards
        accountCount={1}
        interest={interest(0, 0)}
        hasIsaAccount
        isaUsed={null}
        monthlySaving={250}
        totalSavingsBalance={5000}
      />,
    );
    expect(screen.queryByText(INTEREST_LABEL)).toBeNull();
    // An ISA with no saving is stated as a fact in words, never as £0.
    expect(screen.getByText("Paid into ISAs this tax year")).toBeDefined();
    expect(screen.getByText("None")).toBeDefined();
    expect(container.textContent).not.toMatch(/£0(?![\d,])|0\.00%/);
  });

  it("leaves out the ISA card when no account is an ISA, and says interest outside an ISA is before tax", () => {
    render(
      <SavingsSummaryCards
        accountCount={1}
        interest={interest(0, 144)}
        hasIsaAccount={false}
        isaUsed={null}
        monthlySaving={150}
        totalSavingsBalance={3200}
      />,
    );
    expect(screen.queryByText("Paid into ISAs this tax year")).toBeNull();
    expect(screen.getByText("£144")).toBeDefined();
    expect(screen.getByText("An estimate, before tax.")).toBeDefined();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("shows one prompt when nothing is set", () => {
    render(
      <SavingsSummaryCards
        accountCount={1}
        interest={null}
        hasIsaAccount={false}
        isaUsed={null}
        monthlySaving={null}
        totalSavingsBalance={5000}
      />,
    );
    expect(screen.getByText(KPI_PROMPT_TITLE)).toBeDefined();
    expect(screen.queryByText("Not set")).toBeNull();
  });

  it("explains the split, the tax position and what is left out", () => {
    expect(interestExplain(interest(126.83, 123.36, 1))).toBe(
      "An estimate from each savings account's balance, interest rate and monthly saving, if the rate stays the same. It assumes each month's saving goes in at the end of the month. £127 is from ISAs and £123 from other savings. Interest in an ISA is tax-free. Whether you pay tax on other interest depends on your other income. Accounts without an interest rate are not counted.",
    );
  });

  it("rounds the split so the two parts add up to the card", () => {
    // 100.50 + 100.50 = 201.00, so the card reads £201. Rounding each part alone would give
    // £101 + £101 = £202. Instead ISA = round(100.50) = £101 and other = 201 − 101 = £100.
    expect(interestExplain(interest(100.5, 100.5))).toContain(
      "£101 is from ISAs and £100 from other savings.",
    );
  });

  it("leaves out a part of the split that rounds to £0", () => {
    // ISA £0.40 rounds to £0; total 0.40 + 143.70 = 144.10, shown as £144. With the ISA part at
    // £0 the split sentence is left out, rather than "£0 is from ISAs and £144 from other savings".
    const text = interestExplain(interest(0.4, 143.7));
    expect(text).not.toContain("is from ISAs");
    expect(text).not.toMatch(/£0(?![\d,])/);
    // Other savings £0.30 rounds to £0: total 80.00 + 0.30 = 80.30, shown as £80, all from ISAs.
    expect(interestExplain(interest(80, 0.3))).not.toContain("from other savings");
  });

  it("hides the interest card when the total rounds to £0", () => {
    // 0.20 + 0.19 = 0.39, which rounds to £0: no card rather than a £0 figure.
    const { container } = render(
      <SavingsSummaryCards
        accountCount={2}
        interest={interest(0.2, 0.19)}
        hasIsaAccount={false}
        isaUsed={null}
        monthlySaving={100}
        totalSavingsBalance={50}
      />,
    );
    expect(screen.queryByText(INTEREST_LABEL)).toBeNull();
    expect(container.textContent).not.toMatch(/£0(?![\d,])/);
  });

  it("says an ISA-only estimate is tax-free without saying before tax", () => {
    render(
      <SavingsSummaryCards
        accountCount={1}
        interest={interest(80, 0)}
        hasIsaAccount
        isaUsed={1200}
        monthlySaving={100}
        totalSavingsBalance={4000}
      />,
    );
    expect(screen.getByText("An estimate. ISA interest is tax-free.")).toBeDefined();
  });
});
