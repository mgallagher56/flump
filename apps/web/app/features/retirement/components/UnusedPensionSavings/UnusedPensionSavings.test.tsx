import { UK_PENSION_INHERITANCE_RULES } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  formatRuleDate,
  UnusedPensionSavings,
  unusedPensionSavingsLines,
} from "./UnusedPensionSavings";

const open = () =>
  fireEvent.click(screen.getByRole("button", { name: /What happens to unused pension savings/ }));

describe("UnusedPensionSavings", () => {
  it("is closed by default and opens on click", () => {
    render(<UnusedPensionSavings todayIso="2026-11-25" />);
    const trigger = screen.getByRole("button", { name: /What happens to unused pension savings/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/An estate is everything a person owns/)).toBeNull();
    open();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("An estate is everything a person owns when they die.")).toBeTruthy();
  });

  it("states every figure and date from the engine's rules", () => {
    const lines = unusedPensionSavingsLines(UK_PENSION_INHERITANCE_RULES);
    // The wording sent for approval, with figures read on 2026-11-25: 6 April 2027, 40%,
    // 325,000, 175,000, 1 for every 2 above 2 million, 5 April 2031, the sixth month, 75, 1,073,100.
    expect(lines.inheritanceTax[0]).toBe(
      "From 6 April 2027, most unused pension savings and pension death benefits count as part of a person's estate for inheritance tax.",
    );
    expect(lines.inheritanceTax[5]).toBe(
      "Inheritance tax is due by the end of the sixth month after the death.",
    );
    expect(lines.thresholds).toEqual([
      "Inheritance tax is usually charged at 40% on the part of an estate above its tax-free thresholds.",
      "The standard threshold is £325,000. A further £175,000 can apply when a home passes to children or grandchildren.",
      "The further threshold reduces by £1 for every £2 of estate above £2 million.",
      "Unused thresholds can pass to a surviving spouse or civil partner. These figures are fixed until 5 April 2031.",
    ]);
    expect(lines.incomeTax[0]).toBe(
      "After a death before age 75, the pension is usually free of income tax. Lump sums are tax-free up to the lump sum and death benefit allowance, £1,073,100 for most people.",
    );
    expect(lines.incomeTax[1]).toBe(
      "After a death at 75 or over, the pension is taxed as income of the person who receives it.",
    );
    expect(lines.checked).toBe("Rules checked on 25 November 2026.");
  });

  it("says the rules do not apply yet on 5 April 2027, and drops the line on 6 April 2027", () => {
    const notBefore =
      "These rules apply to deaths on or after 6 April 2027. They do not apply before that date.";
    const { unmount } = render(<UnusedPensionSavings todayIso="2027-04-05" />);
    open();
    expect(screen.getByText(notBefore)).toBeTruthy();
    unmount();
    render(<UnusedPensionSavings todayIso="2027-04-06" />);
    open();
    expect(screen.queryByText(notBefore)).toBeNull();
  });

  it("shows the not-yet-law notice only when the rules are draft", () => {
    const { unmount } = render(<UnusedPensionSavings todayIso="2026-11-25" />);
    open();
    expect(screen.queryByTestId("pension-iht-not-law")).toBeNull();
    unmount();
    render(
      <UnusedPensionSavings
        todayIso="2026-11-25"
        rules={{ ...UK_PENSION_INHERITANCE_RULES, status: "draft" }}
      />,
    );
    open();
    expect(screen.getByTestId("pension-iht-not-law").textContent).toBe(
      "These rules are proposed and not yet law. They may change before 6 April 2027.",
    );
    // A draft rule is never stated as applying from a date.
    expect(screen.queryByText(/They do not apply before that date/)).toBeNull();
  });

  it("follows a changed figure in the rules object", () => {
    const lines = unusedPensionSavingsLines({
      ...UK_PENSION_INHERITANCE_RULES,
      nilRateBandGbp: 350_000,
      residenceTaperThresholdGbp: 2_500_000,
    });
    expect(lines.thresholds[1]).toMatch(/^The standard threshold is £350,000\./);
    expect(lines.thresholds[2]).toBe(
      "The further threshold reduces by £1 for every £2 of estate above £2,500,000.",
    );
  });

  it("says Flump does not estimate it and links to GOV.UK", () => {
    render(<UnusedPensionSavings todayIso="2026-11-25" />);
    open();
    expect(
      screen.getByText(
        "Flump does not estimate inheritance tax. It does not hold details of a will, gifts or other belongings.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Inheritance tax on GOV.UK" }).getAttribute("href"),
    ).toBe("https://www.gov.uk/inheritance-tax");
    expect(
      screen
        .getByRole("link", { name: "Tax on a pension you inherit on GOV.UK" })
        .getAttribute("href"),
    ).toBe("https://www.gov.uk/tax-on-pension-death-benefits");
  });

  it("formats ISO dates in en-GB", () => {
    expect(formatRuleDate("2031-04-05")).toBe("5 April 2031");
  });
});
