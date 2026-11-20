import { Button, Card, PageSection } from "@repo/ui";
import { Calculator } from "lucide-react";
import type { FC } from "react";
import type { CalculatedInterestOffer } from "../../linkedAccounts";
import { accountName, actions, body, figure, line, list, title } from "./CalculatedFigures.styles";

export interface CalculatedFiguresProps {
  /** The figures to offer, from `calculatedInterestOffers`. Nothing is drawn when empty. */
  offers: readonly CalculatedInterestOffer[];
  taxYear: string;
  /** Adds the figure as a record linked to its account. */
  onAdd: (offer: CalculatedInterestOffer) => void;
  /** True while a save is on its way: the buttons wait. */
  pending?: boolean;
}

const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const rate = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 });

/**
 * "Calculated" interest figures for the user to confirm into a record (owner decision 5): one
 * card per buy-to-let mortgage or taxable savings account, with what the estimate rests on and
 * its limits. Nothing counts towards the estimate until the user adds it.
 */
export const CalculatedFigures: FC<CalculatedFiguresProps> = ({
  offers,
  taxYear,
  onAdd,
  pending = false,
}) => {
  if (offers.length === 0) return null;
  return (
    <PageSection
      description="Worked out from your accounts. Check each one before you add it."
      domain="tax"
      headingId="calculated-figures-heading"
      icon={Calculator}
      id="calculated-figures"
      title="Figures to check"
    >
      <ul className={list()}>
        {offers.map((offer) => {
          const mortgage = offer.kind === "mortgage_interest";
          const testId = `calculated-figure-${offer.accountId}`;
          const estimateLineId = `${testId}-estimate`;
          return (
            <li key={`${offer.kind}-${offer.accountId}`}>
              <Card as="article" data-testid={testId} id={testId} padding="lg">
                <div className={body()}>
                  <p className={accountName()}>{offer.accountName}</p>
                  <h3 className={title()}>
                    {mortgage
                      ? `Estimated mortgage interest for ${taxYear}: `
                      : `Estimated savings interest for ${taxYear}: `}
                    <span className={figure()}>{money.format(offer.amount)}</span>
                    {!mortgage && offer.sharePercent < 100 ? " (your share)" : null}
                  </h3>
                  {mortgage ? (
                    <>
                      <p className={line()} id={estimateLineId}>
                        {`An estimate from this mortgage's monthly balances and its ${rate.format(offer.ratePct)}% rate. Check it against your lender's yearly statement.`}
                      </p>
                      <p className={line()}>
                        Only interest on borrowing for the let property counts towards this
                        estimate. It cannot see a rate change during the year.
                      </p>
                    </>
                  ) : (
                    <p className={line()} id={estimateLineId}>
                      {`An estimate from this account's monthly balances and its ${rate.format(offer.ratePct)}% rate. Interest paid once a year may count in a different tax year.`}
                    </p>
                  )}
                  <div className={actions()}>
                    <Button
                      aria-describedby={estimateLineId}
                      aria-label={`Add this estimate as a record: ${offer.accountName}`}
                      disabled={pending}
                      size="sm"
                      type="button"
                      variant="secondary"
                      onClick={() => onAdd(offer)}
                    >
                      Add this estimate as a record
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </PageSection>
  );
};
