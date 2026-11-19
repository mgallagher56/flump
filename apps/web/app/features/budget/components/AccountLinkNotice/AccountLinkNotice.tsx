import type { BudgetAccountLinkOffer } from "@flump/finance-engine";
import { Button } from "@repo/ui";
import { type FC, useState } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { accountLinkNotice } from "./AccountLinkNotice.styles";

export interface AccountLinkNoticeProps {
  /** A budget entry that matches one account's monthly saving or payment (the engine's offer). */
  offer: Pick<BudgetAccountLinkOffer, "rowName" | "accountName" | "monthly" | "link">;
  /** Links the entry to the account. Rejects when the save failed; the page says why. */
  onLink: () => Promise<void>;
  /** Keeps the entry as typed. Nothing is saved: the note goes for this visit only. */
  onKeep: () => void;
}

/** What the account's monthly amount is called, by kind of line. */
const AMOUNT_NAME: Record<BudgetAccountLinkOffer["link"], string> = {
  savings: "monthly saving",
  debt: "monthly payment",
};

/**
 * One quiet note on a budget entry that matches an account's saved monthly saving or payment
 * (system audit slice 5, decision 1): the entry is a typed copy that goes stale when the account
 * changes. It offers a one-tap link and changes nothing on its own: a typed figure is the person's.
 */
export const AccountLinkNotice: FC<AccountLinkNoticeProps> = ({ offer, onLink, onKeep }) => {
  const slots = accountLinkNotice();
  const { formatCurrency } = useFormatCurrency();
  const [linking, setLinking] = useState(false);

  const link = async () => {
    setLinking(true);
    try {
      await onLink();
    } catch {
      // The page shows what went wrong; the note stays so it can be tried again.
    } finally {
      setLinking(false);
    }
  };

  return (
    <div aria-label={`About ${offer.rowName}`} className={slots.root} role="note">
      <p className={slots.entry}>{offer.rowName}</p>
      <p className={slots.text}>
        This matches the {AMOUNT_NAME[offer.link]} of{" "}
        <span className={slots.amount}>
          {formatCurrency(offer.monthly, { maximumFractionDigits: 0 })}
        </span>{" "}
        a month on {offer.accountName}. Link it and it changes when the account does.
      </p>
      <div className={slots.actions}>
        <Button pending={linking} size="sm" variant="outline" onClick={() => void link()}>
          Link to {offer.accountName}
        </Button>
        <Button disabled={linking} size="sm" variant="outline" onClick={onKeep}>
          Keep my own figure
        </Button>
      </div>
    </div>
  );
};
