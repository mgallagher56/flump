import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSubmit = vi.hoisted(() => vi.fn());
/** What the route action answered; set it and render again to deliver the answer. */
const answer = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock("react-router", () => ({
  useFetcher: () => ({ submit: mockSubmit, state: "idle", data: answer.data }),
}));

import { AddPensionAccountDialog } from "./AddPensionAccountDialog";

const DIRECT = "Extra paid in each month (optional)";

const CONFLICT =
  "We did not save this because it was changed somewhere else. The latest version is now loaded. Check it and save again.";

describe("AddPensionAccountDialog", () => {
  beforeEach(() => {
    mockSubmit.mockClear();
    answer.data = undefined;
  });

  it("renders the form fields when open and no default trigger", () => {
    render(<AddPensionAccountDialog isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Add a pension pot" })).toBeDefined();
    expect(screen.getByLabelText(/Pot or provider name/)).toBeDefined();
    expect(screen.getByLabelText("Current value")).toBeDefined();
    expect(screen.getByLabelText("Assumed growth a year (optional)")).toBeDefined();
    expect(screen.getByLabelText(DIRECT)).toBeDefined();
    expect(screen.queryByRole("button", { name: /^Add pension pot$/i })).toBeNull();
  });

  it("renders a supplied trigger button and nothing when none is given", () => {
    const { rerender } = render(<AddPensionAccountDialog isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
    rerender(
      <AddPensionAccountDialog
        isOpen={false}
        triggerButton={<button type="button">Open it</button>}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Open it" })).toBeDefined();
  });

  it("populates fields when editing an existing pot", () => {
    const existingPot = {
      id: "pot-123",
      name: "Vanguard SIPP",
      balance: 15000,
      interestRate: 7.0,
      monthlyContribution: 200,
      type: "Pension",
    };
    render(
      <AddPensionAccountDialog
        accountToEdit={existingPot as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Edit pension pot" })).toBeDefined();
    expect((screen.getByLabelText(/Pot or provider name/) as HTMLInputElement).value).toBe(
      "Vanguard SIPP",
    );
    expect((screen.getByLabelText("Current value") as HTMLInputElement).value).toBe("15,000");
    expect((screen.getByLabelText(DIRECT) as HTMLInputElement).value).toBe("200");
  });

  it("disables the regular payment when Past pot is selected", () => {
    render(<AddPensionAccountDialog isOpen={true} onClose={vi.fn()} />);
    const direct = screen.getByLabelText(DIRECT) as HTMLInputElement;
    expect(direct.disabled).toBe(false);
    fireEvent.click(screen.getByRole("radio", { name: /Past pot/i }));
    expect(direct.disabled).toBe(true);
    expect(direct.value).toBe("");
  });

  it("populates a past pot with the regular payment disabled", () => {
    const pastPot = {
      id: "pot-past",
      name: "Old Employer Pension",
      balance: 12000,
      interestRate: 4.5,
      monthlyContribution: null,
      isCurrent: false,
      type: "Pension",
    };
    render(
      <AddPensionAccountDialog accountToEdit={pastPot as never} isOpen={true} onClose={vi.fn()} />,
    );
    const direct = screen.getByLabelText(DIRECT) as HTMLInputElement;
    expect(direct.disabled).toBe(true);
    expect(direct.value).toBe("");
  });

  it("keeps Add pot disabled until named, then submits the create intent and closes once it is saved", () => {
    const onClose = vi.fn();
    const dialog = () => <AddPensionAccountDialog isOpen={true} onClose={onClose} />;
    const { rerender } = render(dialog());
    const add = screen.getByRole("button", { name: "Add pot" }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Pot or provider name/), { target: { value: "Nest" } });
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: "createPensionAccount",
        name: "Nest",
        balance: "0",
        // Blank growth rate: saved as unset, never a pre-filled 5%.
        interestRate: "",
        isCurrent: "true",
      }),
      { method: "POST", action: "/app/pension" },
    );
    // Open until the action answers, so a refused save keeps what was typed.
    expect(onClose).not.toHaveBeenCalled();
    answer.data = { success: true };
    rerender(dialog());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("sends the saved pot's version, and after a 412 stays open with the message and what was typed", () => {
    const onClose = vi.fn();
    const pot = {
      id: "p1",
      name: "Nest",
      balance: 9000,
      isCurrent: true,
      updatedAt: "2026-11-14T09:30:00.123Z",
    };
    const dialog = (accountToEdit: typeof pot) => (
      <AddPensionAccountDialog
        accountToEdit={accountToEdit as never}
        isOpen={true}
        onClose={onClose}
      />
    );
    const { rerender } = render(dialog(pot));
    fireEvent.change(screen.getByLabelText(/Pot or provider name/), {
      target: { value: "Nest workplace" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[0]?.[0]).toMatchObject({
      intent: "updatePensionAccount",
      accountId: "p1",
      name: "Nest workplace",
      version: "2026-11-14T09:30:00.123Z",
    });

    // The pot changed somewhere else: the action answers 412 and the loader runs again.
    answer.data = { success: false, conflict: true, error: CONFLICT };
    rerender(dialog({ ...pot, balance: 9100, updatedAt: "2026-11-15T10:00:00.000Z" }));
    expect(screen.getByRole("alert").textContent).toContain(CONFLICT);
    expect(onClose).not.toHaveBeenCalled();
    expect((screen.getByLabelText(/Pot or provider name/) as HTMLInputElement).value).toBe(
      "Nest workplace",
    );

    // Saving again sends the latest version.
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit.mock.calls[1]?.[0]).toMatchObject({
      name: "Nest workplace",
      version: "2026-11-15T10:00:00.000Z",
    });
  });

  it("submits an update for an existing pot with no field left unchanged re-sent", () => {
    mockSubmit.mockClear();
    render(
      <AddPensionAccountDialog
        accountToEdit={{ id: "p9", name: "Aviva", balance: 100, interestRate: 4 } as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "updatePensionAccount", accountId: "p9" }),
      { method: "POST", action: "/app/pension" },
    );
    const sent = mockSubmit.mock.calls.at(-1)?.[0] as Record<string, string>;
    // An untouched value is never re-sent: a re-sent balance writes a history row this month.
    for (const key of ["name", "balance", "interestRate", "isCurrent", "monthlyContribution"]) {
      expect(sent).not.toHaveProperty(key);
    }
  });

  it("sends the value only when it changed", () => {
    mockSubmit.mockClear();
    render(
      <AddPensionAccountDialog
        accountToEdit={{ id: "p9", name: "Aviva", balance: 100, interestRate: 4 } as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Current value"), { target: { value: "150" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    const sent = mockSubmit.mock.calls.at(-1)?.[0] as Record<string, string>;
    expect(sent.balance).toBe("150");
    expect(sent).not.toHaveProperty("interestRate");
  });

  it("offers Delete pot only when editing with a delete handler, and never deletes by itself", () => {
    mockSubmit.mockClear();
    const onDeleteRequest = vi.fn();
    const { rerender } = render(
      <AddPensionAccountDialog isOpen={true} onClose={vi.fn()} onDeleteRequest={onDeleteRequest} />,
    );
    expect(screen.queryByRole("button", { name: "Delete pot" })).toBeNull();
    rerender(
      <AddPensionAccountDialog
        accountToEdit={{ id: "p9", name: "Aviva", balance: 100 } as never}
        isOpen={true}
        onClose={vi.fn()}
        onDeleteRequest={onDeleteRequest}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete pot" }));
    expect(onDeleteRequest).toHaveBeenCalledTimes(1);
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it("saves a cleared growth rate as unset, not as an assumed figure", () => {
    mockSubmit.mockClear();
    render(
      <AddPensionAccountDialog
        accountToEdit={{ id: "p9", name: "Aviva", balance: 100, interestRate: 4 } as never}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Assumed growth a year (optional)"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ interestRate: "" }), {
      method: "POST",
      action: "/app/pension",
    });
  });
});
