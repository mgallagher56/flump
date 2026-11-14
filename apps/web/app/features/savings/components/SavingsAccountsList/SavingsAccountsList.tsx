import { Button, Card, CollapsibleDrawer, Icon, Money, VisuallyHidden } from "@repo/ui";
import { Pencil } from "lucide-react";
import { type FC, useState } from "react";
import { Link, useFetcher } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { AddSavingsAccountDialog } from "../AddSavingsAccountDialog";
import {
  accountLink,
  accountMeta,
  accountName,
  accountType,
  actionsCell,
  balance,
  drawerWrap,
  listHeader,
  listRoot,
  listTitle,
  row,
  rowEnd,
  rowList,
} from "./SavingsAccountsList.styles";

export interface SavingsAccountsListProps {
  accounts: Account[];
}

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;

const typeLabel = (acc: Account) => (acc.type === "Investment" ? "Investment" : "Savings");

/**
 * "Your accounts": one figure per row, the balance (plan P1.4), and one "Edit" button, the same
 * as pension pots. The rate, the amount saved each month and "Delete account" live in the edit
 * dialog; deleting always asks for confirmation.
 */
export const SavingsAccountsList: FC<SavingsAccountsListProps> = ({ accounts }) => {
  const fetcher = useFetcher();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setConfirmDeleteId(null) });

  const accountToDelete = confirmDeleteId
    ? accounts.find((acc) => acc.id === confirmDeleteId)
    : undefined;

  // A list, not a table: at 320 to 375 the name wraps onto more lines while the balance and Edit
  // stay right-aligned on the row, so nothing clips or scrolls sideways.
  const renderRows = (rows: Account[]) => (
    <ul aria-label="Savings and investment accounts" className={rowList()}>
      {rows.map((acc) => (
        <li className={row()} data-list-row="" key={acc.id}>
          <span className={accountMeta()}>
            <Link className={accountLink()} to={`/app/accounts/${acc.id}`}>
              <span className={accountName()}>{acc.name}</span>
            </Link>
            <span className={accountType()}>{typeLabel(acc)}</span>
          </span>
          <span className={rowEnd()}>
            <span className={balance()}>
              <VisuallyHidden>Balance </VisuallyHidden>
              <Money size="sm" value={Math.round(Number(acc.balance) || 0)} />
            </span>
            <span className={actionsCell()}>
              <Button
                aria-label={`Edit ${acc.name}`}
                size="sm"
                variant="ghost"
                onClick={() => setEditingAccount(acc)}
              >
                <Icon icon={Pencil} size="sm" />
                Edit
              </Button>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );

  const visible = accounts.slice(0, VISIBLE_ROWS);
  const rest = accounts.slice(VISIBLE_ROWS);

  return (
    <section
      aria-labelledby="savings-accounts-heading"
      className={listRoot()}
      data-testid="savings-accounts"
      id="savings-accounts"
    >
      <div className={listHeader()}>
        <h2 className={listTitle()} id="savings-accounts-heading">
          Your accounts
        </h2>
      </div>

      <Card padding="none">
        {renderRows(visible)}
        {rest.length > 0 && (
          <div className={drawerWrap()}>
            <CollapsibleDrawer
              closedLabel="Show all"
              openLabel="Show fewer"
              title={`${rest.length} more ${rest.length === 1 ? "account" : "accounts"}`}
              variant="quiet"
            >
              {renderRows(rest)}
            </CollapsibleDrawer>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={accountToDelete !== undefined}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteId(null);
            deleteOutcome.dismiss();
          }
        }}
        pending={deleteOutcome.pending}
        error={deleteOutcome.error}
        title={`Delete ${accountToDelete?.name ?? "account"}?`}
        description="Its balance history will be deleted too. This cannot be undone."
        confirmLabel="Delete account"
        tone="danger"
        onConfirm={() => {
          if (!confirmDeleteId) return;
          deleteOutcome.begin();
          fetcher.submit(
            { intent: "deleteAccount", accountId: confirmDeleteId },
            { method: "POST", action: "/app/savings" },
          );
        }}
      />

      {editingAccount && (
        <AddSavingsAccountDialog
          accountToEdit={editingAccount}
          isOpen={true}
          onClose={() => setEditingAccount(null)}
          onDeleteRequest={() => {
            setConfirmDeleteId(editingAccount.id || null);
            setEditingAccount(null);
          }}
        />
      )}
    </section>
  );
};

export default SavingsAccountsList;
