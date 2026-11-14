import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import { CHECK_IN_ACCOUNTS, CHECK_IN_DETAILS } from "../../fixtures";
import type { AccountDetailInput } from "../../snapshotModel";
import { useCheckIn } from "../../useCheckIn";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { CheckInCard } from "./CheckInCard";

const [everyday, isa, , card] = CHECK_IN_ACCOUNTS.map((a) => a.id) as [
  string,
  string,
  string,
  string,
];

const Harness: FC<{ onSave: SaveSnapshot; details?: AccountDetailInput[] }> = ({
  onSave,
  details = CHECK_IN_DETAILS,
}) => {
  const checkIn = useCheckIn({
    accounts: CHECK_IN_ACCOUNTS,
    accountDetails: details,
    month: "2026-11",
    open: true,
    onSave,
  });
  return checkIn.finished ? <p>Summary</p> : <CheckInCard checkIn={checkIn} />;
};

const setup = (details?: AccountDetailInput[], save: () => Promise<boolean> = async () => true) => {
  const onSave = vi.fn(save);
  render(<Harness details={details} onSave={onSave as SaveSnapshot} />);
  return { onSave };
};

describe("CheckInCard", () => {
  it("shows one account at a time with its place in the list", () => {
    setup();
    expect(screen.getByText("1 of 4")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Everyday account" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Credit card" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });

  it("moves to the next account once the answer is saved, and back again", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole("button", { name: "No change" }));
    await waitFor(() => expect(screen.getByText("2 of 4")).toBeDefined());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "Credit card" })).toBeDefined();
    expect(screen.getByRole("textbox", { name: /Amount owed now/ })).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("No change")).toBeDefined();
    expect(screen.getByRole("button", { name: "Change Everyday account" })).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("2 of 4")).toBeDefined();
  });

  it("stays on the card with an error when the save fails", async () => {
    setup(undefined, async () => false);
    await userEvent.click(screen.getByRole("button", { name: "No change" }));
    await waitFor(() =>
      expect(
        screen.getByText("We could not save this balance. Nothing has changed. Try again."),
      ).toBeDefined(),
    );
    expect(screen.getByText("1 of 4")).toBeDefined();
  });

  it("resumes at the first account with nothing recorded", () => {
    setup([
      ...CHECK_IN_DETAILS,
      { accountId: everyday, year: 2026, month: 11, value: 3360 },
      { accountId: card, year: 2026, month: 11, value: -640 },
    ]);
    expect(screen.getByText("3 of 4")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Stocks ISA" })).toBeDefined();
  });

  it("records the rest at once with No change to the rest", async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole("button", { name: "No change to the rest" }));
    await waitFor(() => expect(screen.getByText("Summary")).toBeDefined());
    expect(onSave).toHaveBeenCalledTimes(1);
    const values = (onSave.mock.calls[0] as unknown as [{ payload: { values: unknown[] } }])[0]
      .payload.values;
    expect(values).toHaveLength(4);
    expect(values).toContainEqual({ accountId: isa, value: 14200, source: "confirmed" });
  });
});
