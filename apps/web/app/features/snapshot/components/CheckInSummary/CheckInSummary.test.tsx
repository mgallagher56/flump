import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CheckInSummary as Summary } from "../../checkInModel";
import { CheckInSummary } from "./CheckInSummary";

const changes = (n: number): Summary["changed"] =>
  Array.from({ length: n }, (_, i) => ({
    accountId: `a${i}`,
    name: `Account ${i + 1}`,
    value: 1000 + i,
    previous: i === 1 ? null : 900,
    calculated: i === 0,
  }));

const setup = (summary: Partial<Summary> = {}) => {
  const onDone = vi.fn();
  const onChangeBalance = vi.fn();
  render(
    <CheckInSummary
      month="2026-11"
      onChangeBalance={onChangeBalance}
      onDone={onDone}
      summary={{
        changed: changes(2),
        netWorth: 231400,
        change: 1250,
        previousMonth: "2026-10",
        ...summary,
      }}
    />,
  );
  return { onDone, onChangeBalance };
};

describe("CheckInSummary", () => {
  it("states it is saved, what changed and net worth against last month", () => {
    setup();
    expect(screen.getByTestId("checkin-summary-scene").getAttribute("data-scene")).toBe(
      "check-in-done",
    );
    expect(screen.getByRole("heading", { name: "November is checked in." })).toBeDefined();
    expect(screen.getByRole("heading", { name: "What changed" })).toBeDefined();
    expect(screen.getByText("Account 1")).toBeDefined();
    expect(screen.getByText("Calculated")).toBeDefined();
    expect(screen.getByText("Up £1,250 on October 2026.")).toBeDefined();
  });

  it("shows each change from the old figure to the new one, in whole pounds", () => {
    setup();
    expect(screen.getByText("£900 to £1,000")).toBeDefined();
    // With no saved balance before, the new figure stands alone.
    expect(screen.getByText("£1,001")).toBeDefined();
  });

  it("makes net worth the summary's largest figure, without verdict words", () => {
    setup();
    const block = screen.getByTestId("checkin-net-worth");
    expect(block.textContent).toBe("Net worth£231,400Up £1,250 on October 2026.");
    const figure = screen.getByText("£231,400");
    expect(figure.className).toContain("textStyle_numeric.lg");
    for (const el of document.querySelectorAll('[class*="textStyle_numeric"]')) {
      if (el !== figure) expect(el.className).not.toContain("numeric.lg");
    }
  });

  it("uses the same sentence when net worth went down, with no verdict", () => {
    setup({ change: -1250 });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Down £1,250 on October 2026.");
    expect(text).not.toMatch(/well done|great|good news|congrat|!/i);
  });

  it("shows at most 8 changes until Show all", async () => {
    setup({ changed: changes(11) });
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    await userEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(11);
  });

  it("leaves out the list when nothing changed, keeping the net worth line", () => {
    setup({ changed: [], change: 0 });
    expect(screen.queryByRole("heading", { name: "What changed" })).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
    expect(document.body.textContent).not.toMatch(/No balances changed/);
    expect(screen.getByText("The same as October 2026.")).toBeDefined();
    expect(screen.getByText("£231,400")).toBeDefined();
  });

  it("closes with Done and goes back with Change a balance", async () => {
    const { onDone, onChangeBalance } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await userEvent.click(screen.getByRole("button", { name: "Change a balance" }));
    expect(onDone).toHaveBeenCalled();
    expect(onChangeBalance).toHaveBeenCalled();
  });

  it("celebrates the check-in, never the amount: the heading names the month only", () => {
    setup();
    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.textContent).toBe("November is checked in.");
    expect(heading.textContent).not.toMatch(/£|net worth/i);
    // Set 3 Month in brief + the net worth block both state the change.
    expect(screen.getAllByText(/£1,250/)).toHaveLength(2);
  });

  it("shows Month in brief with identical neutral wording whichever way figures moved (N4)", () => {
    setup({ change: 1150, debtsChange: -320, accountsAdded: 1 });
    const brief = screen.getByTestId("checkin-month-in-brief");
    expect(brief.textContent).toBe(
      "November in brief.Net worth changed by +£1,150. Debts changed by −£320. One account added.",
    );
  });

  it("uses the same Month in brief sentence when net worth falls and debts rise", () => {
    setup({ change: -1150, debtsChange: 320, accountsAdded: 0 });
    const brief = screen.getByTestId("checkin-month-in-brief");
    expect(brief.textContent).toBe(
      "November in brief.Net worth changed by −£1,150. Debts changed by +£320. 2 accounts updated.",
    );
  });
});
