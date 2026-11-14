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
    calculated: i === 0,
  }));

const setup = (summary: Partial<Summary> = {}) => {
  const onDone = vi.fn();
  const onChangeBalance = vi.fn();
  render(
    <CheckInSummary
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
    expect(screen.getByRole("heading", { name: "Check-in saved" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "What changed" })).toBeDefined();
    expect(screen.getByText("Account 1")).toBeDefined();
    expect(screen.getByText("Calculated")).toBeDefined();
    expect(screen.getByText("Net worth: £231,400, up £1,250 on October 2026.")).toBeDefined();
  });

  it("uses the same sentence when net worth went down, with no verdict", () => {
    setup({ change: -1250 });
    const text = document.body.textContent ?? "";
    expect(text).toContain("Net worth: £231,400, down £1,250 on October 2026.");
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
    expect(screen.getByText("Net worth: £231,400, the same as October 2026.")).toBeDefined();
  });

  it("closes with Done and goes back with Change a balance", async () => {
    const { onDone, onChangeBalance } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await userEvent.click(screen.getByRole("button", { name: "Change a balance" }));
    expect(onDone).toHaveBeenCalled();
    expect(onChangeBalance).toHaveBeenCalled();
  });
});
