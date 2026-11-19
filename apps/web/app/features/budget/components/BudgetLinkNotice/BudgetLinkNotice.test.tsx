import type { BudgetLinkOffer } from "@flump/finance-engine";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetLinkNotice } from "./BudgetLinkNotice";

const takeHome: BudgetLinkOffer = {
  link: "take_home",
  monthly: 2453.3,
  kind: null,
  paymentEstimated: false,
  rowIds: ["cb"],
};
const rent: BudgetLinkOffer = {
  link: "housing",
  monthly: 1200,
  kind: "rent",
  paymentEstimated: false,
  rowIds: ["hi"],
};
const estimate: BudgetLinkOffer = {
  link: "housing",
  monthly: 1234.56,
  kind: "mortgage",
  paymentEstimated: true,
  rowIds: ["m"],
};

describe("BudgetLinkNotice", () => {
  it("shows nothing when every saved figure is in the budget", () => {
    const { container } = render(<BudgetLinkNotice offers={[]} onAdd={vi.fn()} />);
    expect(container.textContent).toBe("");
  });

  it("says plainly that each saved figure is not in the budget, in whole pounds", () => {
    render(<BudgetLinkNotice offers={[takeHome, rent]} onAdd={vi.fn()} />);
    const note = screen.getByRole("note", { name: "Saved figures not in this budget" });
    expect(note.textContent).toContain(
      "Your take-home pay of £2,453 from Profile is not in this budget yet.",
    );
    expect(note.textContent).toContain(
      "Your rent of £1,200 from your housing details is not in this budget yet.",
    );
    expect(screen.getByRole("button", { name: "Add your take-home pay of £2,453" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Add your rent of £1,200" })).toBeDefined();
  });

  it("calls the mortgage estimate 'about'", () => {
    render(<BudgetLinkNotice offers={[estimate]} onAdd={vi.fn()} />);
    expect(screen.getByRole("note").textContent).toContain(
      "Your mortgage payment of about £1,235 is not in this budget yet.",
    );
    expect(
      screen.getByRole("button", { name: "Add your mortgage payment of about £1,235" }),
    ).toBeDefined();
  });

  it("adds the saved figure it names", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<BudgetLinkNotice offers={[takeHome, rent]} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Add your rent of £1,200" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith(rent));
  });

  it("keeps the note when adding fails", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("no"));
    render(<BudgetLinkNotice offers={[rent]} onAdd={onAdd} />);
    fireEvent.click(screen.getByRole("button", { name: "Add your rent of £1,200" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect(screen.getByRole("note")).toBeDefined();
  });

  it("offers to choose an entry to replace outside the editor, and points to the entries inside it", () => {
    const onChooseEntry = vi.fn();
    const { rerender } = render(
      <BudgetLinkNotice offers={[rent]} onAdd={vi.fn()} onChooseEntry={onChooseEntry} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Replace one of your entries instead" }));
    expect(onChooseEntry).toHaveBeenCalledTimes(1);
    rerender(<BudgetLinkNotice offers={[rent]} onAdd={vi.fn()} />);
    expect(screen.getByRole("note").textContent).toContain(
      "Or use the button on one of your entries to replace it with the saved figure.",
    );
  });

  it("says a saved mortgage payment comes from your saved details", () => {
    render(
      <BudgetLinkNotice
        offers={[
          {
            link: "housing",
            monthly: 1250,
            kind: "mortgage",
            paymentEstimated: false,
            rowIds: ["m"],
          },
        ]}
        onAdd={vi.fn().mockResolvedValue(undefined)}
      />,
    );
    expect(screen.getByRole("note").textContent).toContain(
      "Your mortgage payment of £1,250 from your saved details is not in this budget yet.",
    );
  });
});
