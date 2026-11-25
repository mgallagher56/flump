import { UK_SELF_EMPLOYED_PENSION_RULES } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SelfEmployedPensions, selfEmployedPensionLines } from "./SelfEmployedPensions";

describe("SelfEmployedPensions", () => {
  it("is closed by default and opens on click", () => {
    render(<SelfEmployedPensions />);
    const trigger = screen.getByRole("button", { name: /Pensions when you are self-employed/ });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("Pension contributions do not reduce Class 4 National Insurance."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", {
          name: "Tax relief on pension contributions on GOV.UK (opens in a new tab)",
        })
        .getAttribute("href"),
    ).toBe("https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief");
  });

  it("states the 2026/27 figures from the engine", () => {
    const lines = selfEmployedPensionLines(UK_SELF_EMPLOYED_PENSION_RULES);
    expect(lines.intro).toBe(
      "Shown because your employment type is self-employed. UK rules for the 2026 to 2027 tax year.",
    );
    // RV17: 80 paid / 0.8 = 100 in the pension.
    expect(lines.facts[1]).toBe(
      "In most personal pensions, the provider adds basic rate tax relief. A payment of £80 becomes £100 in the pension.",
    );
    expect(lines.facts[3]).toBe(
      "Tax relief covers contributions up to a year's UK earnings. Where earnings are lower, it covers up to £3,600 a year, including the relief.",
    );
    // GOV.UK annual-allowance: £60,000 in 2026/27 (getUkPensionAllowances).
    expect(lines.facts[4]).toBe(
      "Contributions above the annual allowance, £60,000 for most people, can lead to a tax charge.",
    );
    expect(lines.facts[6]).toBe(
      "With profits of £7,105 or more, Class 2 National Insurance is treated as paid. That adds a qualifying year for the State Pension.",
    );
    // £3.65 keeps its pence; 10 qualifying years from the State Pension rules.
    expect(lines.facts[7]).toBe(
      "Below that, voluntary Class 2 contributions cost £3.65 a week. Any new State Pension takes at least 10 qualifying years.",
    );
  });

  it("follows a changed figure in the rules object", () => {
    const lines = selfEmployedPensionLines({
      ...UK_SELF_EMPLOYED_PENSION_RULES,
      class2VoluntaryWeeklyGbp: 3.8,
    });
    expect(lines.facts[7]).toMatch(
      /^Below that, voluntary Class 2 contributions cost £3\.80 a week\./,
    );
  });
});
