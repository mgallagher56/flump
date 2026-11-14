import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FC } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CheckInAnswer, CheckInStep as Step } from "../../checkInModel";
import { CHECK_IN_ACCOUNTS, CHECK_IN_DETAILS } from "../../fixtures";
import { useCheckIn } from "../../useCheckIn";
import type { SaveSnapshot } from "../../useSaveSnapshot";
import { CheckInStep, type CheckInStepLayout } from "./CheckInStep";

const [everyday, , mortgage] = CHECK_IN_ACCOUNTS.map((a) => a.id) as [string, string, string];

const Harness: FC<{
  accountId: string;
  layout?: CheckInStepLayout;
  onAnswer: (step: Step, answer: CheckInAnswer) => void;
  onSave?: SaveSnapshot;
}> = ({ accountId, layout = "card", onAnswer, onSave }) => {
  const checkIn = useCheckIn({
    accounts: CHECK_IN_ACCOUNTS,
    accountDetails: CHECK_IN_DETAILS,
    month: "2026-11",
    open: true,
    onSave: onSave ?? (async () => true),
  });
  const step = checkIn.steps.find((s) => s.accountId === accountId);
  if (!step) return null;
  return (
    <CheckInStep
      checkIn={checkIn}
      layout={layout}
      onAnswer={(s, a) => {
        onAnswer(s, a);
        void checkIn.confirm(s, a);
      }}
      onRetry={(s) => void checkIn.retry(s)}
      step={step}
    />
  );
};

describe("CheckInStep", () => {
  it("shows the account, last month's figure and the two choices", () => {
    render(<Harness accountId={everyday} onAnswer={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Everyday account" })).toBeDefined();
    expect(screen.getByText("Current balance: £3,360")).toBeDefined();
    expect(screen.getByRole("textbox", { name: /New balance/ })).toBeDefined();
    const update = screen.getByRole("button", { name: "Update" }) as HTMLButtonElement;
    expect(update.disabled).toBe(true);
    expect(screen.getByRole("button", { name: "No change" })).toBeDefined();
  });

  it("enables Update once a figure is typed and sends it", async () => {
    const onAnswer = vi.fn();
    render(<Harness accountId={everyday} onAnswer={onAnswer} />);
    await userEvent.type(screen.getByRole("textbox", { name: /New balance/ }), "3412.50");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(onAnswer.mock.calls[0]?.[1]).toEqual({ kind: "update", value: 3412.5 });
    await waitFor(() => expect(screen.getByText("Updated £3,412.50")).toBeDefined());
    expect(screen.getByRole("button", { name: "Change Everyday account" })).toBeDefined();
  });

  it("shows a calculated figure that is kept with one press", async () => {
    const onAnswer = vi.fn();
    render(<Harness accountId={mortgage} onAnswer={onAnswer} />);
    expect(screen.getByText("Calculated")).toBeDefined();
    expect(screen.getByText("£186,000")).toBeDefined();
    expect(
      screen.getByText(
        "From your interest rate of 4.5% and monthly payment of £1,250 since October 2026.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
    // The calculated figure stands alone: no saved balance beside it, open or done.
    expect(screen.queryByText(/Current balance/)).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Keep this figure" }));
    expect(onAnswer.mock.calls[0]?.[1]).toEqual({ kind: "keepCalculated" });
    await waitFor(() => expect(screen.getByText("Calculated £186,000")).toBeDefined());
    expect(screen.queryByText(/Current balance/)).toBeNull();
  });

  it("reveals the balance field to enter a different figure", async () => {
    const onAnswer = vi.fn();
    render(<Harness accountId={mortgage} onAnswer={onAnswer} />);
    await userEvent.click(screen.getByRole("button", { name: "Enter a different figure" }));
    const field = screen.getByRole("textbox", { name: /Amount owed now/ });
    await userEvent.type(field, "185900");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(onAnswer.mock.calls[0]?.[1]).toEqual({ kind: "update", value: 185900 });
  });

  it("shows an inline error when the save fails and saves again on Try again", async () => {
    const onSave = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    render(<Harness accountId={everyday} onAnswer={vi.fn()} onSave={onSave as SaveSnapshot} />);
    await userEvent.click(screen.getByRole("button", { name: "No change" }));
    await waitFor(() =>
      expect(
        screen.getByText("We could not save this balance. Nothing has changed. Try again."),
      ).toBeDefined(),
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("No change")).toBeDefined());
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("collapses a saved desktop row to its status", async () => {
    render(<Harness accountId={everyday} layout="row" onAnswer={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "No change" }));
    await waitFor(() => expect(screen.getByTestId(`checkin-status-${everyday}`)).toBeDefined());
    expect(screen.queryByText("Current balance: £3,360")).toBeNull();
  });
});
