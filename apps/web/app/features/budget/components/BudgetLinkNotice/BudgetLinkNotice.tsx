import type { BudgetLinkOffer } from "@flump/finance-engine";
import { Button, Card } from "@repo/ui";
import { type FC, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { budgetLinkNotice } from "./BudgetLinkNotice.styles";

export interface BudgetLinkNoticeProps {
  /** Saved figures not in the budget yet (the engine's `budgetLinkOffers`). Nothing shows when empty. */
  offers: readonly BudgetLinkOffer[];
  /** Adds the saved figure as its own linked entry. Rejects when the save failed; the page says why. */
  onAdd: (offer: BudgetLinkOffer) => Promise<void>;
  /**
   * Opens the editor, where each of the person's entries offers to be replaced by the saved figure.
   * Left out inside the editor, where those buttons are already on the entries.
   */
  onChooseEntry?: () => void;
}

/** What the saved figure is called, by which fact it is. */
const FIGURE_NAME: Record<NonNullable<BudgetLinkOffer["kind"]> | "take_home", string> = {
  take_home: "take-home pay",
  rent: "rent",
  mortgage: "mortgage payment",
  household: "household contribution",
};

const figureName = (offer: BudgetLinkOffer): string =>
  FIGURE_NAME[offer.link === "take_home" ? "take_home" : (offer.kind ?? "rent")];

/** Where the saved figure comes from, or nothing for the mortgage accounts' estimate. */
const figureSource = (offer: BudgetLinkOffer): string =>
  offer.link === "take_home"
    ? " from Profile"
    : offer.paymentEstimated
      ? ""
      : offer.kind === "mortgage"
        ? // A saved mortgage payment is on the mortgage account, or in the details for a mortgage
          // with no account payment yet (audit slice 5): both are saved details.
          " from your saved details"
        : " from your housing details";

/**
 * One quiet note on the budget page when a saved figure (take-home pay, the rent or mortgage
 * payment) is not in the budget: the budget has entries of that kind of its own, so the saved
 * figure is neither added nor swapped in unasked, and it is counted nowhere until the person
 * chooses. It says so plainly and offers both choices: add the saved figure as its own entry, or
 * replace one of their entries with it.
 */
export const BudgetLinkNotice: FC<BudgetLinkNoticeProps> = ({ offers, onAdd, onChooseEntry }) => {
  const slots = budgetLinkNotice();
  const { formatCurrency } = useFormatCurrency();
  const [adding, setAdding] = useState<BudgetLinkOffer["link"] | null>(null);
  if (offers.length === 0) return null;

  const add = async (offer: BudgetLinkOffer) => {
    if (adding) return;
    setAdding(offer.link);
    try {
      await onAdd(offer);
    } catch {
      // The page shows what went wrong; the note stays so it can be tried again.
    } finally {
      setAdding(null);
    }
  };

  return (
    <Card
      aria-label="Saved figures not in this budget"
      className={slots.root}
      data-testid="budget-link-notice"
      id="budget-link-notice"
      padding="md"
      role="note"
    >
      {offers.map((offer) => {
        const name = figureName(offer);
        const about = offer.paymentEstimated ? "about " : "";
        const figure = formatCurrency(offer.monthly, { maximumFractionDigits: 0 });
        return (
          <div
            className={slots.item}
            data-testid={`budget-link-notice-${offer.link}`}
            id={`budget-link-notice-${offer.link}`}
            key={offer.link}
          >
            <p className={slots.text}>
              Your {name} of {about}
              <span className={slots.amount}>{figure}</span>
              {figureSource(offer)} is not in this budget yet.
            </p>
            <div className={slots.actions}>
              <Button
                data-testid={`budget-link-notice-add-${offer.link}`}
                id={`budget-link-notice-add-${offer.link}`}
                disabled={adding !== null && adding !== offer.link}
                pending={adding === offer.link}
                size="sm"
                variant="outline"
                onClick={() => void add(offer)}
              >
                Add your {name} of {about}
                {figure}
              </Button>
            </div>
          </div>
        );
      })}
      {onChooseEntry ? (
        <div className={slots.actions}>
          <Button
            data-testid="budget-link-notice-choose"
            id="budget-link-notice-choose"
            size="sm"
            variant="ghost"
            onClick={onChooseEntry}
          >
            Replace one of your entries instead
          </Button>
        </div>
      ) : (
        <p className={slots.text}>
          Or use the button on one of your entries to replace it with the saved figure.
        </p>
      )}
    </Card>
  );
};
