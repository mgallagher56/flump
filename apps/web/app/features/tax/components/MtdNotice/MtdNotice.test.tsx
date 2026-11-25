import { checkMtdQualifyingIncome, type TaxRecordFields } from "@flump/finance-engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("MtdNotice", () => {
  it("states the date, the figure, the year and that Flump does not send anything", () => {
    render(<MtdNotice copy={overCopy} />);
    const notice = screen.getByTestId("mtd-notice");
    expect(notice.getAttribute("data-kind")).toBe("over");
    expect(
      screen.getByText(
        "Making Tax Digital for Income Tax is a set of HMRC rules for keeping records and reporting self-employed and property income through software.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "From 6 April 2027, HMRC expects people over its threshold to keep digital records and send quarterly updates using compatible software.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "The self-employed and property income you recorded for the 2025 to 2026 tax year, before expenses, is over £30,000, the threshold for that date.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Flump does not send anything to HMRC and is not compatible software for this.",
      ),
    ).toBeTruthy();
  });

  it("links to GOV.UK to check and to sign up, in a new tab", () => {
    render(<MtdNotice copy={overCopy} />);
    const check = screen.getByRole("link", { name: /Check if you need to use it on GOV.UK/ });
    const signUp = screen.getByRole("link", { name: /Sign up on GOV.UK/ });
    expect(check.getAttribute("href")).toBe(
      "https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax",
    );
    expect(signUp.getAttribute("href")).toBe(
      "https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax",
    );
    expect(check.getAttribute("target")).toBe("_blank");
    expect(check.textContent).toContain("(opens in a new tab)");
  });

  it("shows the shorter general line with one link when the position is unknown", () => {
    render(<MtdNotice copy={generalCopy} />);
    expect(screen.getByTestId("mtd-notice").getAttribute("data-kind")).toBe("general");
    expect(
      screen.getByText(
        "Making Tax Digital for Income Tax asks some self-employed people and landlords to keep digital records and send quarterly updates through software. Flump does not send anything to HMRC.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders nothing with no copy or once dismissed", () => {
    const { container, rerender } = render(<MtdNotice copy={null} />);
    expect(container.innerHTML).toBe("");
    rerender(<MtdNotice copy={overCopy} dismissed />);
    expect(container.innerHTML).toBe("");
  });

  it("hides at once and saves the dismissal when hidden", () => {
    const onDismiss = vi.fn();
    render(<MtdNotice copy={overCopy} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide this notice" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("mtd-notice")).toBeNull();
  });

  it("has no hide button when there is nowhere to save the dismissal", () => {
    render(<MtdNotice copy={overCopy} />);
    expect(screen.queryByRole("button", { name: "Hide this notice" })).toBeNull();
  });
});
