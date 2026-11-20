import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type FC, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { FetcherOutcomeStatus } from "~/features/feedback/hooks/useFetcherOutcome";
import { QuickBalanceUpdate, type QuickBalanceUpdateProps } from "./QuickBalanceUpdate";

/** Stands in for the page: a save resolves to `result` once the component calls onSave. */
const Harness: FC<
  Partial<QuickBalanceUpdateProps> & { result?: "succeeded" | "failed"; spy?: (v: number) => void }
> = ({ result = "succeeded", spy, ...props }) => {
  const [status, setStatus] = useState<FetcherOutcomeStatus>("idle");
  return (
    <QuickBalanceUpdate
      accountName="Holiday fund"
      current={500}
      error={status === "failed" ? "We could not save that. Try again." : null}
      isLiability={false}
      onSave={(v) => {
        spy?.(v);
        setStatus("pending");
        setTimeout(() => setStatus(result), 0);
      }}
      status={status}
      {...props}
    />
  );
};

// As the page does: opening clears the last outcome.
const Reopen: FC = () => {
  const [status, setStatus] = useState<FetcherOutcomeStatus>("idle");
  return (
    <QuickBalanceUpdate
      accountName="Holiday fund"
      current={500}
      error={status === "failed" ? "We could not save that. Try again." : null}
      isLiability={false}
      onOpen={() => setStatus("idle")}
      onSave={() => setStatus("failed")}
      status={status}
    />
  );
};

const open = () => userEvent.click(screen.getByRole("button", { name: "Update balance" }));
const field = () => screen.getByRole("textbox", { name: "New balance" });

describe("<QuickBalanceUpdate />", () => {
  it("opens a field in place with the focus in it and the current figure", async () => {
    render(<Harness />);
    await open();
    expect(document.activeElement).toBe(field());
    expect((field() as HTMLInputElement).value).toBe("500");
    // Selected, so typing replaces it.
    expect((field() as HTMLInputElement).selectionStart).toBe(0);
    expect((field() as HTMLInputElement).selectionEnd).toBe(3);
    expect(screen.getByRole("form", { name: "New balance, Holiday fund" })).toBeDefined();
  });

  it("saves the typed figure on Enter, closes and gives focus back to the button", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await open();
    await userEvent.clear(field());
    await userEvent.type(field(), "750{Enter}");
    expect(spy).toHaveBeenCalledWith(750);
    const button = await screen.findByRole("button", { name: "Update balance" });
    expect(document.activeElement).toBe(button);
    expect(screen.queryByRole("textbox", { name: "New balance" })).toBeNull();
  });

  it("closes on Escape without saving and gives focus back", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await open();
    await userEvent.type(field(), "9{Escape}");
    expect(spy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Update balance" }));
  });

  it("closes on Cancel without saving", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(spy).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Update balance" }));
  });

  it("keeps the row open with the error and the typed figure when the save fails", async () => {
    render(<Harness result="failed" />);
    await open();
    await userEvent.clear(field());
    await userEvent.type(field(), "750{Enter}");
    expect((await screen.findByRole("alert")).textContent).toContain("We could not save that.");
    expect((field() as HTMLInputElement).value).toBe("750");
  });

  it("a reopened row does not show the error from an earlier failed save", async () => {
    render(<Reopen />);
    await open();
    await userEvent.type(field(), "{Enter}");
    expect(await screen.findByRole("alert")).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await open();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("asks a debt for the amount owed now", async () => {
    render(<Harness current={1200} isLiability />);
    await userEvent.click(screen.getByRole("button", { name: "Update amount owed" }));
    expect(
      (screen.getByRole("textbox", { name: "Amount owed now" }) as HTMLInputElement).value,
    ).toBe("1,200");
  });

  it("says so, and saves nothing, when a debt's amount owed is below zero", async () => {
    const spy = vi.fn();
    render(<Harness current={1200} isLiability spy={spy} />);
    await userEvent.click(screen.getByRole("button", { name: "Update amount owed" }));
    const owed = screen.getByRole("textbox", { name: "Amount owed now" });
    await userEvent.clear(owed);
    await userEvent.type(owed, "-50{Enter}");
    // The field takes the minus sign as typed (only blur clamps it), so Enter submits -50.
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText("Enter an amount owed of £0 or more.")).toBeDefined();
  });

  it("shows the joint-account note under the field", async () => {
    render(<Harness hint="Enter the whole balance of the joint account." />);
    await open();
    const describedBy = field().getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe(
      "Enter the whole balance of the joint account.",
    );
  });
});
