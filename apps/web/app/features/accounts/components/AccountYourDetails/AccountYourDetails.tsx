import { Card, Money, StatusBadge } from "@repo/ui";
import type { FC } from "react";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import { isLiabilityType } from "~/containers/accounts/utils";
import {
  detailsCard,
  detailsHeader,
  detailsTitle,
  fact,
  factLabel,
  factList,
  factValue,
  stateLine,
} from "./AccountYourDetails.styles";

export interface AccountYourDetailsProps {
  accountId: string;
  name: string;
  type: string;
  /** Saved balance, as an amount (an amount owed for a liability). */
  balance: number;
  /** For example "March 2026": the latest month with a recorded balance. */
  lastUpdated: string | null;
}

/** Saved facts only. Nothing here is a scenario input and nothing here is changed by one. */
export const AccountYourDetails: FC<AccountYourDetailsProps> = ({
  accountId,
  name,
  type,
  balance,
  lastUpdated,
}) => (
  <Card className={detailsCard()}>
    <section aria-labelledby="account-your-details-heading">
      <div className={detailsHeader()}>
        <div>
          <h2 className={detailsTitle()} id="account-your-details-heading">
            Your account
          </h2>
          <p className={stateLine()}>
            <StatusBadge size="sm" variant="neutral">
              Saved
            </StatusBadge>
            {lastUpdated ? <span>Last updated {lastUpdated}</span> : null}
          </p>
        </div>
        <AddEditAccountsDialogBtn accountId={accountId} isEditAccount />
      </div>
      <dl className={factList()}>
        <div className={fact()}>
          <dt className={factLabel()}>Name</dt>
          <dd className={factValue()}>{name}</dd>
        </div>
        <div className={fact()}>
          <dt className={factLabel()}>Type</dt>
          <dd className={factValue()}>{type}</dd>
        </div>
        <div className={fact()}>
          <dt className={factLabel()}>{isLiabilityType(type) ? "Amount owed" : "Balance"}</dt>
          <dd className={factValue()}>
            <Money size="md" value={balance} />
          </dd>
        </div>
      </dl>
    </section>
  </Card>
);

export default AccountYourDetails;
