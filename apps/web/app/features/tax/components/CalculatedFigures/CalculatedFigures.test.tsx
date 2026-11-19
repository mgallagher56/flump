import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CalculatedInterestOffer } from "../../linkedAccounts";
import { CalculatedFigures } from "./CalculatedFigures";

const mortgage: CalculatedInterestOffer = {
  kind: "mortgage_interest",
  accountId: "m1",
  accountName: "Flat 2 mortgage",
  ratePct: 4.5,
  amount: 6750,
  sharePercent: 100,
};
const savings: CalculatedInterestOffer = {
  kind: "savings_interest",
  accountId: "s1",
  accountName: "Easy access",
  ratePct: 4,
  amount: 785.7,
  sharePercent: 50,
};

describe("CalculatedFigures", () => {
  it("shows the calculated mortgage interest, what it rests on and its limits", () => {
    render(<CalculatedFigures offers={[mortgage]} taxYear="2026/27" onAdd={vi.fn()} />);
    const card = screen.getByTestId("calculated-figure-m1");
    expect(card.textContent).toContain("Calculated mortgage interest for 2026/27: £6,750.00");
    expect(card.textContent).toContain(
      "An estimate from this mortgage's monthly balances and its 4.5% rate. Check it against your lender's yearly statement.",
    );
    expect(card.textContent).toContain(
      "Only interest on borrowing for the let property counts. This estimate cannot see a rate change during the year.",
    );
    expect(card.textContent).toContain("Flat 2 mortgage");
  });

  it("shows the calculated savings interest at the person's share", () => {
    render(<CalculatedFigures offers={[savings]} taxYear="2026/27" onAdd={vi.fn()} />);
    const card = screen.getByTestId("calculated-figure-s1");
    expect(card.textContent).toContain(
      "Calculated savings interest for 2026/27: £785.70 (your share)",
    );
    expect(card.textContent).toContain(
      "An estimate from this account's monthly balances and its 4% rate. Interest paid once a year may count in a different tax year.",
    );
  });

  it("says no share on a sole account", () => {
    render(
      <CalculatedFigures
        offers={[{ ...savings, sharePercent: 100 }]}
        taxYear="2026/27"
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByTestId("calculated-figure-s1").textContent).not.toContain("your share");
  });

  it("adds the figure as a record when asked", () => {
    const onAdd = vi.fn();
    render(<CalculatedFigures offers={[mortgage, savings]} taxYear="2026/27" onAdd={onAdd} />);
    fireEvent.click(
      within(screen.getByTestId("calculated-figure-m1")).getByRole("button", {
        name: /^Add as a record/,
      }),
    );
    expect(onAdd).toHaveBeenCalledWith(mortgage);
  });

  it("disables the buttons while a save is on its way", () => {
    render(<CalculatedFigures offers={[mortgage]} pending taxYear="2026/27" onAdd={vi.fn()} />);
    expect(
      (screen.getByRole("button", { name: /Add as a record/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("draws nothing with no figure to offer", () => {
    const { container } = render(
      <CalculatedFigures offers={[]} taxYear="2026/27" onAdd={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
  });
});
