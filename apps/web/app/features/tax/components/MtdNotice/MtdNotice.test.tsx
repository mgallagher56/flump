import { checkMtdQualifyingIncome, type TaxRecordFields } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mtdNoticeCopy } from "../../mtdNotice";
import { MtdNotice } from "./MtdNotice";

const income = (amount: number, date: string): TaxRecordFields => ({
  id: `se-${date}`,
  type: "income",
  source: "self-employed",
  category: "self_employed_income",
  name: "Invoices",
  amount,
  frequency: "annual",
  date,
  endDate: null,
  notes: null,
  accountId: null,
});

// 2025/26 income of £31,000 is over the £30,000 threshold for 6 April 2027 (SI 2026/336 reg 27(b)).
const check = checkMtdQualifyingIncome([income(31_000, "2025-06-01")], "2025/26", "2026-11-25");
if (!check) throw new Error("fixture: 2025/26 is a measured year");
const overCopy = mtdNoticeCopy({ kind: "over", check });
const generalCopy = mtdNoticeCopy({ kind: "unknown" });

const LEAD =
  "The self-employed and property income you recorded for the 2025 to 2026 tax year, before expenses, is over £30,000. Making Tax Digital for Income Tax may apply to you from 6 April 2027.";

describe("MtdNotice", () => {
  it("always shows the recorded income, the figure and the date, with the detail closed", () => {
    render(<MtdNotice copy={overCopy} />);
    expect(screen.getByTestId("mtd-notice").getAttribute("data-kind")).toBe("over");
    expect(screen.getByText(LEAD)).toBeTruthy();
    const toggle = screen.getByRole("button", { name: "Show details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/HMRC works this out/)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens the detail with the HMRC line, the not-compatible line and both GOV.UK links", () => {
    render(<MtdNotice copy={overCopy} />);
    fireEvent.click(screen.getByRole("button", { name: "Show details" }));
    expect(screen.getByRole("button", { name: "Hide details" }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(
      screen.getByText(
        "From 6 April 2027, HMRC expects people over its threshold to keep digital records and send quarterly updates using compatible software.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "HMRC works this out from your Self Assessment tax return, not from Flump. Some people are exempt.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Flump does not send anything to HMRC and is not compatible software for this.",
      ),
    ).toBeTruthy();
    const checkLink = screen.getByRole("link", { name: /Check if you need to use it on GOV.UK/ });
    expect(checkLink.getAttribute("href")).toBe(
      "https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax",
    );
    expect(checkLink.getAttribute("target")).toBe("_blank");
    expect(checkLink.textContent).toContain("(opens in a new tab)");
    expect(screen.getByRole("link", { name: /Sign up on GOV.UK/ }).getAttribute("href")).toBe(
      "https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax",
    );
  });

  it("shows the general line with one link and no details section", () => {
    render(<MtdNotice copy={generalCopy} />);
    expect(screen.getByTestId("mtd-notice").getAttribute("data-kind")).toBe("general");
    expect(
      screen.getByText(
        "Making Tax Digital for Income Tax asks some self-employed people and landlords to keep digital records and send quarterly updates through software. Flump does not send anything to HMRC.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("has no alert role and nothing to dismiss", () => {
    render(<MtdNotice copy={overCopy} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("renders nothing with no copy", () => {
    const { container } = render(<MtdNotice copy={null} />);
    expect(container.innerHTML).toBe("");
  });
});
