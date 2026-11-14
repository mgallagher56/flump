import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddIncomeMenu } from "./AddIncomeMenu";

describe("AddIncomeMenu", () => {
  it("is one button until opened", () => {
    render(<AddIncomeMenu onAdd={vi.fn()} onCopyFromLastYear={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add income" })).toBeDefined();
  });

  it("opens the dialog for the chosen source and copies last year from the same menu", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onCopy = vi.fn();
    render(<AddIncomeMenu onAdd={onAdd} onCopyFromLastYear={onCopy} />);

    await user.click(screen.getByRole("button", { name: "Add income" }));
    await user.click(await screen.findByRole("menuitem", { name: "Rental income" }));
    expect(onAdd).toHaveBeenCalledWith("rental", "income");

    await user.click(screen.getByRole("button", { name: "Add income" }));
    await user.click(await screen.findByRole("menuitem", { name: "Copy from last year" }));
    expect(onCopy).toHaveBeenCalled();
  });
});
