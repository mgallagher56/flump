import { DEFAULT_NET_WORTH_BASIS } from "@flump/finance-engine";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
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

const phoneWidth = () => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
};

const setup = (props: Partial<CheckInSheetProps> = {}) => {
  const refresh = vi.fn();
  const onSave = Object.assign(
    vi.fn(async (_args: SaveSnapshotArgs) => true),
    { refresh },
  );
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
  return { onSave, onOpenChange, refresh };
};

const field = (name: RegExp) => screen.getByRole("textbox", { name }) as HTMLInputElement;

describe("CheckInSheet", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  describe("monthly check-in", () => {
    it("goes account by account in one list from md, skipping connected accounts", () => {
      setup();
      expect(screen.getByRole("dialog", { name: "Monthly check-in: November 2026" })).toBeDefined();
      expect(screen.getByTestId("checkin-list")).toBeDefined();
      expect(screen.getByText("October 2026: £1,200")).toBeDefined();
      expect(screen.getByRole("textbox", { name: /New balance.*Current account/ })).toBeDefined();
      expect(screen.getByRole("textbox", { name: /Amount owed now.*Mortgage/ })).toBeDefined();
      expect(screen.queryByText("Joint account")).toBeNull();
    });

    it("shows one card per account below md", () => {
      phoneWidth();
      setup();
      expect(screen.getByTestId("checkin-card")).toBeDefined();
      expect(screen.getByText("1 of 2")).toBeDefined();
      expect(screen.queryByTestId("checkin-list")).toBeNull();
    });

    it("saves quietly as it goes, shows the summary and reloads saved data once on Done", async () => {
      const { onSave, onOpenChange, refresh } = setup();
      await userEvent.click(screen.getByRole("button", { name: "No change to the rest" }));
      await screen.findByRole("heading", { name: "Check-in saved for November 2026." });
      expect(onSave).toHaveBeenCalledWith({
        month: "2026-11",
        payload: {
          values: [
            { accountId: CURRENT, value: 1200, source: "confirmed" },
            { accountId: MORTGAGE, value: 181000, source: "confirmed" },
          ],
          complete: true,
        },
        saved: 2,
        skipped: 0,
        quiet: true,
      });
      // The connected account counts at its saved balance this month: £900 up on October.
      expect(screen.getByTestId("checkin-net-worth").textContent).toBe(
        "Net worth: −£178,900, up £900 on October 2026.",
      );
      expect(refresh).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not reload saved data when nothing was saved", async () => {
      const { refresh, onOpenChange } = setup();
      await userEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(refresh).not.toHaveBeenCalled();
    });

    it("says to add an account when there is none to check in", () => {
      setup({ accounts: [accounts[2] as (typeof accounts)[number]] });
      expect(
        screen.getByText("Add an account first, then its balance appears here."),
      ).toBeDefined();
    });
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

  describe("net worth choices (back-fill list)", () => {
    it("says a row is not counted only when the choices leave its kind out", () => {
      setup({ mode: "backfill", basis: { countProperty: false, countStudentLoan: false } });
      const mortgage = screen.getByText("Mortgage", { selector: "p" }).parentElement;
      expect(mortgage?.textContent).toContain("Not counted in net worth");
      const current = screen.getByText("Current account", { selector: "p" }).parentElement;
      expect(current?.textContent).not.toContain("Not counted in net worth");
    });

    it("counts the mortgage under the default choices", () => {
      setup({ mode: "backfill" });
      expect(screen.queryByText(/Not counted in net worth/)).toBeNull();
    });
  });
});
