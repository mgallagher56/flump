import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { CHECK_IN_ACCOUNTS, CHECK_IN_DETAILS } from "../../fixtures";
import { useCheckIn } from "../../useCheckIn";
import type { SaveSnapshot, SaveSnapshotArgs } from "../../useSaveSnapshot";
import { CheckInList } from "./CheckInList";

const [everyday, isa, mortgage, card] = CHECK_IN_ACCOUNTS.map((a) => a.id) as [
  string,
  string,
  string,
  string,
];

const Harness: FC<{ onSave: SaveSnapshot }> = ({ onSave }) => {
  const checkIn = useCheckIn({
    accounts: CHECK_IN_ACCOUNTS,
    accountDetails: CHECK_IN_DETAILS,
    month: "2026-11",
    open: true,
    onSave,
  });
  return checkIn.finished ? <p>Summary</p> : <CheckInList checkIn={checkIn} />;
};

const setup = () => {
  const onSave = vi.fn(async (_args: SaveSnapshotArgs) => true);
  render(<Harness onSave={onSave as SaveSnapshot} />);
  return { onSave };
};

const field = (id: string) => screen.getByTestId(`checkin-value-${id}`) as HTMLInputElement;
const values = (onSave: ReturnType<typeof setup>["onSave"], call: number) =>
  onSave.mock.calls[call]?.[0].payload.values;

describe("CheckInList", () => {
  it("lists every account in check-in order", () => {
    setup();
    const names = screen.getAllByRole("heading").map((h) => h.textContent);
    expect(names).toEqual([
      "Everyday account",
      "Credit card",
      "Stocks ISA",
      "Residential mortgage",
    ]);
  });

  it("Enter saves a typed figure and moves to the next row's field", async () => {
    const { onSave } = setup();
    await userEvent.click(field(everyday));
    await userEvent.keyboard("3412.50{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(field(card)));
    expect(values(onSave, 0)).toEqual([{ accountId: everyday, value: 3412.5, source: "manual" }]);
    await waitFor(() => expect(screen.getByText("Updated £3,412.50")).toBeDefined());
  });

  it("Enter on an empty field only moves to the next row and saves nothing", async () => {
    const { onSave } = setup();
    await userEvent.click(field(everyday));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(field(card)));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByTestId(`checkin-status-${everyday}`)).toBeNull();
  });

  it("records No change only with the No change button", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByTestId(`checkin-same-${everyday}`));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(values(onSave, 0)).toEqual([{ accountId: everyday, value: 3360, source: "confirmed" }]);
  });

  it("Tab on an empty field just moves on and saves nothing", async () => {
    const { onSave } = setup();
    await userEvent.click(field(everyday));
    await userEvent.tab();
    expect(onSave).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe(`checkin-same-${everyday}`);
  });

  it("Tab saves a typed figure and moves to the next row", async () => {
    const { onSave } = setup();
    await userEvent.click(field(card));
    await userEvent.keyboard("700");
    await userEvent.tab();
    await waitFor(() => expect(document.activeElement).toBe(field(isa)));
    expect(values(onSave, 0)).toEqual([{ accountId: card, value: 700, source: "manual" }]);
  });

  it("opens with the first row's balance field focused, so typing starts at once", async () => {
    const { onSave } = setup();
    await waitFor(() => expect(document.activeElement).toBe(field(everyday)));
    await userEvent.keyboard("3400{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(field(card)));
    expect(values(onSave, 0)).toEqual([{ accountId: everyday, value: 3400, source: "manual" }]);
  });

  it("moves to the balance field on a calculated row too; an empty Enter saves nothing", async () => {
    const { onSave } = setup();
    await userEvent.click(field(isa));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(field(mortgage)));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(field(everyday)));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("reopens a saved row with Change", async () => {
    setup();
    await userEvent.click(field(everyday));
    await userEvent.keyboard("3400{Enter}");
    const change = await screen.findByRole("button", { name: "Change Everyday account" });
    await userEvent.click(change);
    await waitFor(() => expect(document.activeElement).toBe(field(everyday)));
  });

  // The one-press keep (owner approved 20 November 2026) lives in CheckInSheet, under the list
  // or card, so the list itself holds only the rows.
  it("leaves the one-press keep to the sheet", () => {
    setup();
    expect(screen.queryByRole("button", { name: /^Keep (all|the other)/ })).toBeNull();
  });
});
