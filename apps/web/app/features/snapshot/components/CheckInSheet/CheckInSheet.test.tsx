import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SaveSnapshotArgs } from "../../useSaveSnapshot";
import { CheckInSheet, type CheckInSheetProps } from "./CheckInSheet";

const CURRENT = "a0000000-0000-4000-8000-000000000001";
const MORTGAGE = "a0000000-0000-4000-8000-000000000003";
const BANK = "a0000000-0000-4000-8000-000000000004";

const accounts = [
  { id: CURRENT, name: "Current account", type: "Current", balance: 1500 },
  { id: MORTGAGE, name: "Mortgage", type: "Mortgage", balance: -180000 },
  { id: BANK, name: "Joint account", type: "Current", balance: 900, connectionId: "c1" },
];
const details = [
  { accountId: CURRENT, year: 2026, month: 10, value: 1200 },
  { accountId: MORTGAGE, year: 2026, month: 10, value: -181000 },
  { accountId: CURRENT, year: 2024, month: 3, value: 640 },
];

const setup = (props: Partial<CheckInSheetProps> = {}) => {
  const onSave = vi.fn(async (_args: SaveSnapshotArgs) => true);
  const onOpenChange = vi.fn();
  render(
    <CheckInSheet
      accountDetails={details}
      accounts={accounts}
      basis={DEFAULT_NET_WORTH_BASIS}
      currentMonth="2026-11"
      onOpenChange={onOpenChange}
      onSave={onSave}
      open
      {...props}
    />,
  );
  return { onSave, onOpenChange };
};

const field = (name: RegExp) => screen.getByRole("textbox", { name }) as HTMLInputElement;

describe("CheckInSheet", () => {
  it("lists every account with last month's value and its state", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Monthly check-in: November 2026" })).toBeDefined();
    expect(field(/Current account: balance/).value).toBe("1,200");
    expect(field(/Mortgage: amount owed/).value).toBe("181,000");
    expect(screen.getAllByText("Not updated since October 2026")).toHaveLength(2);
    // Connected accounts are not editable: the bank sync fills them in.
    expect(screen.getByText("Connected: updates from your bank")).toBeDefined();
    expect(screen.queryByRole("textbox", { name: /Joint account/ })).toBeNull();
  });

  it("saves every manual account for the month and closes", async () => {
    const { onSave, onOpenChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Save balances" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onSave).toHaveBeenCalledWith({
      month: "2026-11",
      payload: {
        values: [
          { accountId: CURRENT, value: 1200 },
          { accountId: MORTGAGE, value: 181000 },
        ],
        complete: true,
      },
      saved: 2,
      skipped: 0,
    });
  });

  it("sends an edited value", async () => {
    const { onSave } = setup();
    const input = field(/Current account: balance/);
    await userEvent.clear(input);
    await userEvent.type(input, "1650.25");
    await userEvent.click(screen.getByRole("button", { name: "Save balances" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0].payload.values[0]).toEqual({
      accountId: CURRENT,
      value: 1650.25,
    });
  });

  it("allows a partial save: an emptied field is skipped", async () => {
    const { onSave } = setup();
    await userEvent.clear(field(/Mortgage: amount owed/));
    expect(screen.getByText(/1 of 2 balances ready to save. Empty ones keep/)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Save balances" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]?.[0]).toEqual({
      month: "2026-11",
      payload: { values: [{ accountId: CURRENT, value: 1200 }] },
      saved: 1,
      skipped: 1,
    });
  });

  it("keeps the sheet open when the save fails", async () => {
    const onSave = vi.fn(async () => false);
    const { onOpenChange } = setup({ onSave });
    await userEvent.click(screen.getByRole("button", { name: "Save balances" }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("disables save when every field is empty", async () => {
    setup();
    await userEvent.clear(field(/Current account: balance/));
    await userEvent.clear(field(/Mortgage: amount owed/));
    expect(
      (screen.getByRole("button", { name: "Save balances" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  describe("back-fill", () => {
    it("starts at last month and records any earlier month the user picks", async () => {
      const { onSave } = setup({ mode: "backfill" });
      expect(screen.getByRole("dialog", { name: "Add an earlier month" })).toBeDefined();
      const month = screen.getByRole("combobox", { name: "Month" }) as HTMLSelectElement;
      const year = screen.getByRole("combobox", { name: "Year" }) as HTMLSelectElement;
      expect(month.value).toBe("10");
      expect(year.value).toBe("2026");

      fireEvent.change(year, { target: { value: "2024" } });
      fireEvent.change(month, { target: { value: "03" } });
      // March 2024 has a recorded current account value; the mortgage has none yet, so it is empty.
      await waitFor(() => expect(field(/Current account: balance/).value).toBe("640"));
      expect(field(/Mortgage: amount owed/).value).toBe("");
      await userEvent.type(field(/Mortgage: amount owed/), "195000");
      await userEvent.click(screen.getByRole("button", { name: "Save balances" }));
      await waitFor(() => expect(onSave).toHaveBeenCalled());
      expect(onSave.mock.calls[0]?.[0]).toEqual({
        month: "2024-03",
        payload: {
          values: [
            { accountId: CURRENT, value: 640 },
            { accountId: MORTGAGE, value: 195000 },
          ],
        },
        saved: 2,
        skipped: 0,
      });
    });

    it("clamps a pick in this month or later back to last month", async () => {
      setup({ mode: "backfill" });
      const month = screen.getByRole("combobox", { name: "Month" }) as HTMLSelectElement;
      fireEvent.change(month, { target: { value: "12" } });
      await waitFor(() => expect(month.value).toBe("10"));
    });
  });

  describe("net worth choices", () => {
    it("says a row is not counted only when the choices leave its kind out", () => {
      setup({ basis: { countProperty: false, countStudentLoan: false } });
      const mortgage = screen.getByText("Mortgage", { selector: "p" }).parentElement;
      expect(mortgage?.textContent).toContain("Not counted in net worth");
      const current = screen.getByText("Current account", { selector: "p" }).parentElement;
      expect(current?.textContent).not.toContain("Not counted in net worth");
    });

    it("counts the mortgage under the default choices", () => {
      setup();
      expect(screen.queryByText(/Not counted in net worth/)).toBeNull();
    });
  });
});
