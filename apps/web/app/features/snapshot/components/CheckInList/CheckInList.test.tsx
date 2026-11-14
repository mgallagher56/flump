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

  it("Enter on an empty field records No change", async () => {
    const { onSave } = setup();
    await userEvent.click(field(everyday));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(document.activeElement).toBe(field(card)));
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

  it("moves to Keep this figure on a calculated row", async () => {
    setup();
    await userEvent.click(field(isa));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(document.activeElement?.id).toBe(`checkin-keep-${mortgage}`));
  });

  it("reopens a saved row with Change", async () => {
    setup();
    await userEvent.click(field(everyday));
    await userEvent.keyboard("{Enter}");
    const change = await screen.findByRole("button", { name: "Change Everyday account" });
    await userEvent.click(change);
    await waitFor(() => expect(document.activeElement).toBe(field(everyday)));
  });

  it("records every open row with No change to the rest", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole("button", { name: "No change to the rest" }));
    await waitFor(() => expect(screen.getByText("Summary")).toBeDefined());
    expect(onSave.mock.calls[0]?.[0].payload.complete).toBe(true);
  });
});
