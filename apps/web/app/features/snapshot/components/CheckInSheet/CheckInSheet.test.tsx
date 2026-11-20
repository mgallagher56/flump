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

  describe("one-press keep (E38 S1, owner approved 20 November 2026)", () => {
    const ISA = "a0000000-0000-4000-8000-000000000005";
    const withIsa = {
      accounts: [...accounts, { id: ISA, name: "Stocks ISA", type: "ISA", balance: 5000 }],
      accountDetails: [...details, { accountId: ISA, year: 2026, month: 10, value: 4800 }],
    };

    it("keeps every balance in one save, says how many, and shows the summary", async () => {
      const { onSave } = setup();
      await userEvent.click(
        screen.getByRole("button", { name: "Keep all 2 balances as they are" }),
      );
      await screen.findByRole("heading", { name: "November is checked in." });
      // One save: the saved current balance £1,500, and the mortgage's £180,000 owed (saved as
      // -£180,000, shown positive). Every step then has a figure, so the month is complete.
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({
        month: "2026-11",
        payload: {
          values: [
            { accountId: CURRENT, value: 1500, source: "confirmed" },
            { accountId: MORTGAGE, value: 180000, source: "confirmed" },
          ],
          complete: true,
        },
        saved: 2,
        skipped: 0,
        quiet: true,
      });
      expect(screen.getByTestId("checkin-kept").textContent).toBe(
        "2 balances kept as they are. You can still change any of them.",
      );
      // Still correctable from the summary.
      expect(screen.getByRole("button", { name: "Change a balance" })).toBeDefined();
    });

    it("leaves a row with a typed figure open, keeps the others and moves the focus to it", async () => {
      const { onSave } = setup(withIsa);
      await userEvent.type(field(/New balance.*Current account/), "1600");
      await userEvent.click(
        screen.getByRole("button", { name: "Keep the other 2 balances as they are" }),
      );
      await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
      const sent = onSave.mock.calls[0]?.[0].payload.values.map((v) => v.accountId);
      expect(sent).toEqual([MORTGAGE, ISA]);
      expect(screen.getByTestId("checkin-kept").textContent).toBe(
        "2 balances kept as they are. You can still change any of them.",
      );
      const current = field(/New balance.*Current account/);
      expect(current.value).toBe("1,600");
      await waitFor(() => expect(document.activeElement).toBe(current));
    });

    it("is not offered for fewer than two balances", async () => {
      setup();
      await userEvent.click(screen.getAllByRole("button", { name: "No change" })[0] as HTMLElement);
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: /^Keep (all|the other)/ })).toBeNull(),
      );
    });

    it("on a failed save keeps nothing and shows Try again on each row", async () => {
      const onSave = Object.assign(
        vi.fn(async (_args: SaveSnapshotArgs) => false),
        { refresh: vi.fn() },
      );
      setup({ onSave });
      await userEvent.click(
        screen.getByRole("button", { name: "Keep all 2 balances as they are" }),
      );
      await waitFor(() =>
        expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(2),
      );
      expect(screen.getByTestId("checkin-kept").textContent).toBe("");
    });

    it("is offered under the card on a phone too", async () => {
      phoneWidth();
      const { onSave } = setup();
      await userEvent.click(
        screen.getByRole("button", { name: "Keep all 2 balances as they are" }),
      );
      await screen.findByRole("heading", { name: "November is checked in." });
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe("monthly check-in", () => {
    it("goes account by account in one list from md, skipping connected accounts", () => {
      setup();
      expect(screen.getByRole("dialog", { name: "Monthly check-in" })).toBeDefined();
      expect(screen.getByTestId("checkin-start-scene").getAttribute("data-scene")).toBe("check-in");
      expect(screen.getByTestId("checkin-list")).toBeDefined();
      expect(screen.getByText("Current balance: £1,500")).toBeDefined();
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
      // Illustration sits at the bottom of the sheet, after the account list.
      const list = screen.getByTestId("checkin-list");
      const scene = document.getElementById("checkin-start-scene");
      expect(scene).not.toBeNull();
      expect(list.compareDocumentPosition(scene as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );

      await userEvent.click(screen.getAllByRole("button", { name: "No change" })[0] as HTMLElement);
      await userEvent.click(screen.getByRole("button", { name: "No change" }));
      await screen.findByRole("heading", { name: "November is checked in." });
      expect(onSave).toHaveBeenNthCalledWith(1, {
        month: "2026-11",
        payload: {
          values: [{ accountId: CURRENT, value: 1500, source: "confirmed" }],
        },
        saved: 1,
        skipped: 0,
        quiet: true,
      });
      expect(onSave).toHaveBeenNthCalledWith(2, {
        month: "2026-11",
        payload: {
          values: [{ accountId: MORTGAGE, value: 180000, source: "confirmed" }],
          complete: true,
        },
        saved: 1,
        skipped: 0,
        quiet: true,
      });
      // Against October: current +£300, mortgage £1,000 less owed. The connected account has no
      // October figure, so it compares with its saved balance (no change), as the list does.
      expect(screen.getByTestId("checkin-net-worth").textContent).toBe(
        "Net worth−£177,600Up £1,300 on October 2026.",
      );
      // The summary keeps only the month in the description, not the step instructions.
      expect(screen.queryByText(/Update each balance or keep it as it is/)).toBeNull();
      expect(screen.getByText("November 2026")).toBeDefined();
      expect(refresh).not.toHaveBeenCalled();
      await userEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("shows the instructions on the first card only", async () => {
      phoneWidth();
      setup();
      expect(screen.getByText(/Update each balance or keep it as it is/)).toBeDefined();
      await userEvent.click(screen.getByRole("button", { name: "No change" }));
      await screen.findByText("2 of 2");
      expect(screen.queryByText(/Update each balance or keep it as it is/)).toBeNull();
      expect(screen.getByText("November 2026")).toBeDefined();
    });

    const allRecorded = [
      ...details,
      { accountId: CURRENT, year: 2026, month: 11, value: 1500 },
      { accountId: MORTGAGE, year: 2026, month: 11, value: -180000 },
    ];
    // The side sheet carries a drag handle as its first child; a centred dialog does not.
    // The Sheet names its surface; the centred Dialog does not.
    const isSheet = (el: HTMLElement) => el.hasAttribute("data-sheet-side");

    it("shows the summary in a dialog from md when the month is checked in", async () => {
      setup({ accountDetails: allRecorded, checkedIn: true });
      const dialog = screen.getByRole("dialog", { name: "Monthly check-in" });
      expect(isSheet(dialog)).toBe(false);
      expect(screen.getByRole("heading", { name: "November is checked in." })).toBeDefined();
      // Back to the steps: the long task opens in the side sheet.
      await userEvent.click(screen.getByRole("button", { name: "Change a balance" }));
      await waitFor(() => expect(screen.getByTestId("checkin-list")).toBeDefined());
      expect(isSheet(screen.getByRole("dialog", { name: "Monthly check-in" }))).toBe(true);
      await waitFor(() => expect(document.activeElement?.id).toBe(`checkin-change-${CURRENT}`));
    });

    it("opens on the account list when every account has a row this month but the check-in is not finished (slice 4, CH-3)", () => {
      // Balances saved one by one (an edit on each account), with no finished check-in: not
      // "November is checked in.", which only a finished check-in says.
      setup({ accountDetails: allRecorded, checkedIn: false });
      expect(screen.queryByRole("heading", { name: "November is checked in." })).toBeNull();
      expect(screen.getByTestId("checkin-list")).toBeDefined();
    });

    it("finishes such a month without writing a balance, then shows the summary", async () => {
      const { onSave } = setup({ accountDetails: allRecorded, checkedIn: false });
      await userEvent.click(screen.getByRole("button", { name: "Finish check-in" }));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ month: "2026-11", payload: { values: [], complete: true } }),
      );
      await screen.findByRole("heading", { name: "November is checked in." });
    });

    it("asks for each balance when the month holds only the rows accounts were added with", () => {
      // Accounts added this month write a first row with source "backfill": the check-in still
      // asks for every balance, as for a month with no rows.
      setup({
        accountDetails: [
          ...details,
          { accountId: CURRENT, year: 2026, month: 11, value: 1500, source: "backfill" },
          { accountId: MORTGAGE, year: 2026, month: 11, value: -180000, source: "backfill" },
        ],
        checkedIn: false,
      });
      expect(screen.queryByRole("heading", { name: "November is checked in." })).toBeNull();
      expect(
        screen.getAllByRole("textbox", { name: /^New balance in pounds/ }).length,
      ).toBeGreaterThan(0);
    });

    it("keeps the sheet for a check-in finished in this session, and on a phone", async () => {
      setup();
      await userEvent.click(screen.getAllByRole("button", { name: "No change" })[0] as HTMLElement);
      await userEvent.click(screen.getByRole("button", { name: "No change" }));
      await screen.findByRole("heading", { name: "November is checked in." });
      expect(isSheet(screen.getByRole("dialog", { name: "Monthly check-in" }))).toBe(true);
    });

    it("rises as the bottom sheet on a phone when the month is checked in", () => {
      phoneWidth();
      setup({ accountDetails: allRecorded, checkedIn: true });
      expect(isSheet(screen.getByRole("dialog", { name: "Monthly check-in" }))).toBe(true);
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
