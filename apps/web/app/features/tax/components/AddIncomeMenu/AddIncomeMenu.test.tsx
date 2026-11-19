import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddIncomeMenu } from "./AddIncomeMenu";

describe("AddIncomeMenu", () => {
  it("is one button until opened", () => {
    render(<AddIncomeMenu onAdd={vi.fn()} onCopyFromLastYear={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add income or expense" })).toBeDefined();
  });

  it("keeps the button within its card and lets the label wrap at 320px (P48)", () => {
    render(<AddIncomeMenu onAdd={vi.fn()} onCopyFromLastYear={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Add income or expense" });
    expect(button.className).toContain("max-w_100%");
    expect(button.className).not.toContain("nowrap");
  });

  it("opens the dialog for the chosen source and copies last year from the same menu", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onCopy = vi.fn();
    render(<AddIncomeMenu onAdd={onAdd} onCopyFromLastYear={onCopy} />);

    await user.click(screen.getByRole("button", { name: "Add income or expense" }));
    await user.click(await screen.findByRole("menuitem", { name: "Rental income" }));
    expect(onAdd).toHaveBeenCalledWith("rental", "income");

    await user.click(screen.getByRole("button", { name: "Add income or expense" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy from last year" }));
    expect(onCopy).toHaveBeenCalled();
  });

  it("adds income or an expense, and a PAYE bonus or benefit instead of a payslip", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(<AddIncomeMenu onAdd={onAdd} onCopyFromLastYear={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add income or expense" }));
    expect(screen.queryByRole("menuitem", { name: "Payslip" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Cost" })).toBeNull();
    await user.click(
      await screen.findByRole("menuitem", { name: "Bonus or taxable benefit (PAYE)" }),
    );
    expect(onAdd).toHaveBeenCalledWith("paye", "income");

    await user.click(screen.getByRole("button", { name: "Add income or expense" }));
    await user.click(await screen.findByRole("menuitem", { name: "Expense" }));
    expect(onAdd).toHaveBeenCalledWith("self-employed", "expense");
  });
});
